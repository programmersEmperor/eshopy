import { Request, Response, NextFunction } from "express"
import { checkOtpRestrictions, sellerSchema, sendOtp, trackOtpRequests, userSchema, validateRegisterationData, validateSchema, verifyOtp } from "../utils/auth.helper"
import { prisma } from "../../../../packages/libs/prisma";
import { AuthError, ValidationError } from "../../../../packages/error-handler";
import redis from "../../../../packages/libs/redis";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { setCookie } from "../utils/cookies/setCookie";
import z from "zod";
import Stripe from 'stripe';
import { UserRoles } from "../../../../packages/types";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
});


export const userRegisteration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validateRegisterationData(req.body, UserRoles.User)
        const {name, email} = req.body;
        const existingUser = await prisma.users.findUnique({
            where: { email }
        })
        
        if (existingUser) 
            return next(new ValidationError('User already has this email!'))

        await checkOtpRestrictions(email);
        await trackOtpRequests(email);
        await sendOtp(email, name, "user-activation-email");

        res.status(200).json({
            message: "OTP send to email. Please verfiy your account"
        })
    }
    catch(e){
        return next(e);
    }
}

const userVerifyInputSchema = userSchema.extend({
    otp: z.string({ error: 'Missing required attributes' }).length(4),
})
export const verifyUser = async (req: Request, res: Response, next: NextFunction) =>{
   try {
     // validate input
    validateSchema(userVerifyInputSchema, req.body);
    const {name, email, otp, password} = req.body;
     
     // check there is no user already created
     const presistedUser = await prisma.users.findUnique({
         where: { email }
     })
 
     if (presistedUser) return next(new ValidationError('User already has this email!'))
 
     // validate otp
     const isOtpValid = await verifyOtp(email, otp);
     const failedOtpVerificationAttemptesKey = `otp_attempts:${email}`;
 
     if (!isOtpValid){
         const ALLOWED_FAILED_ATTEMPTS_NUMBER = 2;
 
         // if more than 2 block the user
         const failedOtpVerficiationAttempts = parseInt(await redis.get(failedOtpVerificationAttemptesKey) ?? '0');
         if(failedOtpVerficiationAttempts >= ALLOWED_FAILED_ATTEMPTS_NUMBER){
             await redis.set(`otp_lock:${email}`, `lock`, 'EX', 1800);
             await redis.del(`otp:${email}`)
             throw new ValidationError('Too many failed attempts, your account is lock for 30 minutes');

         }
 
         // increase the failed attempts
         await redis.set(failedOtpVerificationAttemptesKey, failedOtpVerficiationAttempts + 1, 'EX', 300)
         throw new ValidationError(`Invalid OTP! ${ALLOWED_FAILED_ATTEMPTS_NUMBER - failedOtpVerficiationAttempts} attempts reamining!`);
     }
 
     // reset the failed counter
     await redis.del(`otp:${email}`, failedOtpVerificationAttemptesKey);
     
     // create the user
     const registeredUser = await prisma.users.create({  
         data: {
             name,
             email, 
             ...(password && {password : await bcrypt.hash(password, 10)}) 
         }
     })

     return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
            id: registeredUser.id,
            name: registeredUser.name,
            email: registeredUser.email,
        },
     })
   } catch(e){
    return next(e);
   }
}

const loginInputSchema = z.object({
    'email': z.email(),
    'password': z.string().optional()
})
export const loginUser = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        validateSchema(loginInputSchema, req.body);
        const {email, password} = req.body;
        
        // check if not existing
        const presistedUser = await prisma.users.findUnique({
            where : {
                email
            }
        })

        if(!presistedUser) throw new AuthError(`User does not exist!`)
        if(presistedUser.password) {
            const isValidPassowrd = await bcrypt.compare(password, presistedUser.password)
            if(!isValidPassowrd) 
                throw new AuthError(`Invalid Credentials!`)
        }


        //  Create JWT
        const accessToken = jwt.sign({
            id: presistedUser.id,
            role: UserRoles.User
        }, 
        process.env.ACCESS_TOKEN_SECRET!, {
            expiresIn: '15m'
        })
        
        const refershToken = jwt.sign({
            id: presistedUser.id,
            role: UserRoles.User
        },  
        process.env.REFRESH_TOKEN_SECRET!, {
            expiresIn: '7d'
        })

        setCookie(res, 'access-token', accessToken);
        setCookie(res, 'refresh-token', refershToken);

        return res.status(200).json({
            message: 'Login Successfully' ,
            user: {
                id: presistedUser.id,
                name: presistedUser.name,
                email: presistedUser.email
            }
        })
          
    }
    catch(e){
        return next(e)
    }
}

const forgotPasswordInputSchema = z.object({
    email: z.email(),
})
export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        validateSchema(forgotPasswordInputSchema, req.body);
        const {email} = req.body;
        
        // look for the user
        const presistedUser = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if(!presistedUser) throw new ValidationError(`User does not exist!`);

        await checkOtpRestrictions(email);
        await trackOtpRequests(email);
        await sendOtp(email, presistedUser.name, "forgot-password-user-mail")

        res.status(200).json({
            message: "OTP send to email. Please verfiy your account"
        })
    }
    catch(e){
        return next(e)
    }
}

const forgotPasswordOtpInputSchema = z.object({
    email: z.email(),
    otp: z.string(),
})
export const verfiyForgotPasswordOtp = async (req: Request, res: Response, next: NextFunction) =>{
    try {
      // validate input
     validateSchema(forgotPasswordOtpInputSchema, req.body);
     const {email, otp} = req.body;
      
      // check there is no user already created
      const presistedUser = await prisma.users.findUnique({
          where: { email }
      })

      if (!presistedUser) throw new ValidationError(`User does not exist!`);
  
      // validate otp
      const isOtpValid = await verifyOtp(email, otp);
      const failedOtpVerificationAttemptesKey = `otp_attempts:${email}`;
  
      if (!isOtpValid){
          const ALLOWED_FAILED_ATTEMPTS_NUMBER = 2;
  
          // if more than 2 block the user
          const failedOtpVerficiationAttempts = parseInt(await redis.get(failedOtpVerificationAttemptesKey) ?? '0');
          if(failedOtpVerficiationAttempts >= ALLOWED_FAILED_ATTEMPTS_NUMBER){
              await redis.set(`otp_lock:${email}`, `lock`, 'EX', 1800);
              await redis.del(`otp:${email}`)
              throw new ValidationError('Too many failed attempts, your account is lock for 30 minutes');
 
          }
  
          // increase the failed attempts
          await redis.set(failedOtpVerificationAttemptesKey, failedOtpVerficiationAttempts + 1, 'EX', 300)
          throw new ValidationError(`Invalid OTP! ${ALLOWED_FAILED_ATTEMPTS_NUMBER - failedOtpVerficiationAttempts} attempts reamining!`);
      }
  
      // reset the failed counter
      await redis.del(`otp:${email}`, failedOtpVerificationAttemptesKey);
 
      return res.status(200).json({
         message: 'OTP verified. You can reset your password',
      })
    } catch(e){
     return next(e);
    }
 }

const resetPasswordInputSchema = z.object({
    email: z.email(),
    newPassword: z.string(),
})
export const resetPasswordUser = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        validateSchema(resetPasswordInputSchema, req.body);
        const {email, newPassword} = req.body;

        const presistedUser = await prisma.users.findUnique({
            where: {
                email
            }
        })

        if(!presistedUser) throw new ValidationError(`User does not exist!`);
        
        if(presistedUser.password) {
            const isSamePassword = await bcrypt.compare(newPassword, presistedUser.password)
            if(isSamePassword) throw new ValidationError('New passowrd cannot be the same as the old password');
        }

        await prisma.users.update({
            data: {
                password: await bcrypt.hash(newPassword, 10),
            },
            where: {
                email,
            }
        })
        
        return res.status(200).json({
            message: 'Password  reset successfully!'
        })
    }
    catch(e){
        return next(e)
    }
}

const refreshTokenSchema = z.object({
    id: z.string(),
    role: z.enum([UserRoles.User, UserRoles.Seller]),
})
export const refreshToken = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        const refreshToken = req.cookies['refresh-token'];
        if(!refreshToken) throw new ValidationError('Unauthorized! No refresh token found');
        
        const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {id: string, role: UserRoles};
        validateSchema(refreshTokenSchema, decodedToken);

        const presistedUser = await prisma.users.findUnique({
            where: {
                id: decodedToken.id,
            }
        })

        if (!presistedUser) throw new AuthError('Unauthorized! User/Seller not found');

        const newAccessToken = jwt.sign({
            id: decodedToken.id,
            role: decodedToken.role,
        }, 
        process.env.ACCESS_TOKEN_SECRET!, {
            expiresIn: '15m'
        });

        setCookie(res, 'access_token', newAccessToken);
        return res.status(200).json({
            success: true,
        })
    }
    catch(e){
        return next(e)
    }
}

export const getUser = async (req: any, res: Response, next: NextFunction) => {
    try {

        const user = req.user;
        return res.status(200).json({
            success: true,
            user,
        })
    }
    catch(e){
        return next(e)
    }
}

export const sellerRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validateRegisterationData(req.body, UserRoles.Seller)
        const {name, email, phone_number, country} = req.body;
        
        const existingSeller = await prisma.sellers.findUnique({
            where: { email }
        })
        if(existingSeller) throw new ValidationError('Seller already has this email!')

        await checkOtpRestrictions(email);
        await trackOtpRequests(email);
        await sendOtp(email, name, "seller-activation-email");


        return res.status(200).json({
            message: "OTP send to email. Please verfiy your account"
        })        
    }
    catch(e){
        return next(e)
    }
}

const sellerForgotPasswordInputSchema = z.object({
    email: z.email(),
})
export const sellerForgotPassword = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        validateSchema(sellerForgotPasswordInputSchema, req.body);
        const {email} = req.body;
        
        // look for the user
        const presistedUser = await prisma.sellers.findUnique({
            where: {
                email
            }
        });

        if(!presistedUser) throw new ValidationError(`Seller does not exist!`);

        await checkOtpRestrictions(email);
        await trackOtpRequests(email);
        await sendOtp(email, presistedUser.name, "forgot-password-user-mail")

        res.status(200).json({
            message: "OTP send to email. Please verfiy your account"
        })
    }
    catch(e){
        return next(e)
    }
}

const sellerVerifyInputSchema = sellerSchema.extend({
    otp: z.string({ error: 'Missing required attributes' }).length(4),
})
export const verifySeller = async (req: Request, res: Response, next: NextFunction) =>{
   try {
     // validate input
    validateSchema(sellerVerifyInputSchema, req.body);
    const {name, email, otp, password, phone_number, country} = req.body;
     
     // check there is no user already created
     const presistedUser = await prisma.sellers.findUnique({
         where: { email }
     })
 
     if (presistedUser) return next(new ValidationError('Seller already has this email!'))
 
     // validate otp
     const isOtpValid = await verifyOtp(email, otp);
     const failedOtpVerificationAttemptesKey = `otp_attempts:${email}`;
 
     if (!isOtpValid){
         const ALLOWED_FAILED_ATTEMPTS_NUMBER = 2;
 
         // if more than 2 block the user
         const failedOtpVerficiationAttempts = parseInt(await redis.get(failedOtpVerificationAttemptesKey) ?? '0');
         if(failedOtpVerficiationAttempts >= ALLOWED_FAILED_ATTEMPTS_NUMBER){
             await redis.set(`otp_lock:${email}`, `lock`, 'EX', 1800);
             await redis.del(`otp:${email}`)
             throw new ValidationError('Too many failed attempts, your account is lock for 30 minutes');

         }
 
         // increase the failed attempts
         await redis.set(failedOtpVerificationAttemptesKey, failedOtpVerficiationAttempts + 1, 'EX', 300)
         throw new ValidationError(`Invalid OTP! ${ALLOWED_FAILED_ATTEMPTS_NUMBER - failedOtpVerficiationAttempts} attempts reamining!`);
     }
 
     // reset the failed counter
     await redis.del(`otp:${email}`, failedOtpVerificationAttemptesKey);
     
     // create the user
     const registeredUser = await prisma.sellers.create({  
         data: {
             name,
             email, 
             phone_number,
             country,
             ...(password && {password : await bcrypt.hash(password, 10)}) 
         }
     })

     return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        seller: {
            id: registeredUser.id,
            name: registeredUser.name,
            email: registeredUser.email,
        },
     })
   } catch(e){
    return next(e);
   }
}

const createShopInputSchema = z.object({
    name: z.string(),
    bio: z.string(),
    category: z.string(),
    address: z.string(),
    opening_hours: z.string(),
    website: z.string(),
    seller_id: z.string(),
})
export const createShop = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        validateSchema(createShopInputSchema, req.body);
        const {name, bio, category, avatar, address, opening_hours, website, seller_id} = req.body;

        const presistedSeller = await prisma.sellers.findUnique({
            where: {
                id: seller_id
            }
        })
        if(!presistedSeller) throw new ValidationError('Seller not found!');

        const newShop = await prisma.shops.create({
            data: {
                name,
                bio,
                category,
                avatar,
                address,
                openingHours: opening_hours,
                website: website?.trim() !== '' ? website : null,
                sellerId: seller_id,
            },
        })
     
        return res.status(201).json({
            success: true,
            message: 'Shop created successfully',
            shop: newShop,
        })
    }
    catch(e){
        return next(e)
    }
}

const createStripeConnectLinkInputSchema = z.object({
    seller_id: z.string(),
})
export const createStripeConnectLink = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        validateSchema(createStripeConnectLinkInputSchema, req.body);
        const { seller_id} = req.body;

        const presistedSeller = await prisma.sellers.findUnique({
            where: {
                id: seller_id
            }
        })
        if(!presistedSeller) throw new ValidationError('Seller not found!');



        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: presistedSeller.email,
            capabilities: {
                card_payments: {
                    requested: true,
                },
                transfers: {
                    requested: true,
                },
            },
        })

        await prisma.sellers.update({
            where: {
                id: seller_id
            },
            data: {
                stripeId: account.id,
            },
        })

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `http://localhost:3000/api/success`,
            return_url: `http://localhost:3000/api/success`,
            type: 'account_onboarding',
        })

        return res.status(200).json({
            success: true,
            message: 'Stripe connect link created successfully',
            url: accountLink.url,
        })
    }
    catch(e){
        return next(e)
    }
}

const loginSellerInputSchema = z.object({
    'email': z.email(),
    'password': z.string().optional()
})
export const loginSeller = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        validateSchema(loginSellerInputSchema, req.body);
        const {email, password} = req.body;
        
        // check if not existing
        const presistedUser = await prisma.sellers.findUnique({
            where : {
                email
            }
        })

        if(!presistedUser) throw new AuthError(`Seller does not exist!`)
        if(presistedUser.password) {
            const isValidPassowrd = await bcrypt.compare(password, presistedUser.password)
            if(!isValidPassowrd) 
                throw new AuthError(`Invalid Credentials!`)
        }


        //  Create JWT
        const accessToken = jwt.sign({
            id: presistedUser.id,
            role: UserRoles.Seller
        }, 
        process.env.ACCESS_TOKEN_SECRET!, {
            expiresIn: '15m'
        })
        
        const refershToken = jwt.sign({
            id: presistedUser.id,
            role: UserRoles.Seller
        },  
        process.env.REFRESH_TOKEN_SECRET!, {
            expiresIn: '7d'
        })

        setCookie(res, 'seller-access-token', accessToken);
        setCookie(res, 'seller-refresh-token', refershToken);

        return res.status(200).json({
            message: 'Login Successfully' ,
            user: {
                id: presistedUser.id,
                name: presistedUser.name,
                email: presistedUser.email
            }
        })
          
    }
    catch(e){
        return next(e)
    }
}

export const getSeller = async (req: any, res: Response, next: NextFunction) => {
    try {

        const seller = req.seller;
        return res.status(200).json({
            success: true,
            seller,
        })
    }
    catch(e){
        return next(e)
    }
}