import z, { ZodError } from 'zod'
import { ValidationError } from '../../../../packages/error-handler'
import crypto from 'crypto'
import redis from '../../../../packages/libs/redis'
import { sendEmail } from './sendMail'

const userSchema = z.object({
    name: z.string({ error: 'Missing required attributes' }),
    email: z.email('Invalid email format!'),
    password: z.string().optional(),
})

const sellerSchema = userSchema.extend({
    phone_number: z.string({ error: 'Missing required attributes' }),
    country: z.string({ error: 'Missing required attributes' })
})

export enum UserType {
    User = 'user',
    Seller = 'seller'
}

export const validateRegisterationData = (data: unknown, userType: UserType) => {
    try {
        if(userType === UserType.Seller){
            sellerSchema.parse(data)
            return;
        }
        userSchema.parse(data)
    } catch (error) {
        if (error instanceof ZodError){
            throw new ValidationError(error.issues.at(0)?.message)
        }
        throw error;
    }
}

export const checkOtpRestrictions = async (email: string) => {
    const lockedEmail = await redis.get(`otp_lock:${email}`);
    if(lockedEmail) throw new ValidationError('Account locked due to many failed attempts! Try again after 30 minutes')

    const smapLockEmail = await redis.get(`opt_smap_lock:${email}`);
    if(smapLockEmail) throw new ValidationError('Too many OTP requests! Please try again after 1 hour')

    const coolDownEmail = await redis.get(`otp_cooldown:${email}`);
    if(coolDownEmail) throw new ValidationError('Please try again after 1 minute')
}

export const trackOtpRequests = async (email: string) =>{
    const otpRequestKey = `otp_request_count:${email}`;
    let otpRequestsCount = parseInt(await redis.get(otpRequestKey) || '0')
    const HOUR = 3600;

    if(otpRequestsCount >= 2) {
        await redis.set(`otp_lock:${email}`, 'lock', 'EX', HOUR / 2)
        throw new ValidationError('Account locked due to many failed attempts! Try again after 30 minutes')
    }

    // Track request for 30 minutes
    await redis.set(otpRequestKey, otpRequestsCount + 1, "EX", HOUR);  
}

export const sendOtp = async (email: string, name: string, template: string) => {
    const otp = crypto.randomInt(1000, 9999).toString();
    await sendEmail(email, 'Verify Your Email', template, {name, otp})
    await redis.set(`otp:${email}`, otp, 'EX', 300)
    await redis.set(`otp_cooldown:${email}`, "true", 'EX', 60)
}

const userVerificationInput = userSchema.extend({
    otp: z.string({ error: 'Missing required attributes' }).length(4),
})

export const validateUserVerificationInput = (input: unknown )=>{
    try { 
        return userVerificationInput.parse(input);
    } catch (error) {
        if (error instanceof ZodError) throw new ValidationError(error.issues.at(0)?.message)
        throw new ValidationError('Invalid input!')
    }
}

export const verifyOtp = async (email: string, otp: string) => {
    // check if otp is not expired
    const getOtpKey = `otp:${email}`
    const cachedOtp = await redis.get(getOtpKey);
    if (!cachedOtp) throw new ValidationError(`OTP is invalid or expired`)

    // check if the otp is not correct
    return (cachedOtp === otp) 
}

const loginSchema = z.object({
    'email': z.email(),
    'password': z.string().optional()
})

export const validateLoginInput = (data: unknown) => {
    try {
        loginSchema.parse(data)
    } catch (error) {
        if (error instanceof ZodError){
            throw new ValidationError(error.issues.at(0)?.message)
        }
        throw error;
    }
}

const forgetPasswordSchema = z.object({
    email: z.email(),
})

export const validateForgetPasswordInput = (data: unknown) => {
    try {
        forgetPasswordSchema.parse(data)
    }
    catch(error){
        if (error instanceof ZodError){
            throw new ValidationError(error.issues.at(0)?.message)
        }
        throw error;
    }
}