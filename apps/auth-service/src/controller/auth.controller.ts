import { Request, Response, NextFunction } from "express"
import { checkOtpRestrictions, sendOtp, trackOtpRequests, userSchema, UserType, validateRegisterationData, validateSchema, verifyOtp } from "../utils/auth.helper"
import { prisma } from "../../../../packages/libs/prisma";
import { AuthError, ValidationError } from "../../../../packages/error-handler";
import redis from "../../../../packages/libs/redis";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { setCookie } from "../utils/cookies/setCookie";
import z from "zod";

export const userRegisteration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validateRegisterationData(req.body, UserType.User)
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
            role: UserType.User
        }, 
        process.env.ACCESS_TOKEN_SECRET!, {
            expiresIn: '15m'
        })
        
        const refershToken = jwt.sign({
            id: presistedUser.id,
            role: UserType.User
        },  
        process.env.REFRESH_TOKEN_SECRET!, {
            expiresIn: '7d'
        })

        setCookie(res, 'access_token', accessToken);
        setCookie(res, 'refresh_token', refershToken);

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
    role: z.enum([UserType.User, UserType.Seller]),
})
export const refreshToken = async (req: Request, res: Response, next: NextFunction) =>{
    try {
        const refreshToken = req.cookies.refresh_token;
        if(!refreshToken) throw new ValidationError('Unauthorized! No refresh token found');
        
        const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {id: string, role: UserType};
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