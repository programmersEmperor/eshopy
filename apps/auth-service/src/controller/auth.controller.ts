import { Request, Response, NextFunction } from "express"
import { checkOtpRestriction as checkOtpRestrictions, sendOtp, trackOtpRequests, UserType, validateRegisterationData } from "../utils/auth.helper"
import { prisma } from "../../../../packages/libs/prisma";
import { ValidationError } from "../../../../packages/error-handler";

export const userRegisteration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        validateRegisterationData(req.body, UserType.User)
        const {name, email, password} = req.body;
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