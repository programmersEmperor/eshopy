import { Request, Response, NextFunction } from "express"
import { checkOtpRestriction as checkOtpRestrictions, sendOtp, trackOtpRequests, UserType, validateLoginInput, validateRegisterationData, validateUserVerificationInput, verifyOtp } from "../utils/auth.helper"
import { prisma } from "../../../../packages/libs/prisma";
import { AuthError, ValidationError } from "../../../../packages/error-handler";
import redis from "../../../../packages/libs/redis";
import bcrypt from "bcryptjs";

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

export const verifyUser = async (req: Request, res: Response, next: NextFunction) =>{
   try {
     // validate input
    validateUserVerificationInput(req.body);
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

