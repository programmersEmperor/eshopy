import { Router } from "express";
import { loginUser, userForgotPassword, userRegisteration, verfiyForgotPasswordOtp, verifyUser } from "../controller/auth.controller";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)
router.post('/login-user', loginUser)
router.post('/forgot-password-user', userForgotPassword);
router.post('/verify-forgot-password', verfiyForgotPasswordOtp);
router.post('/reset-password-user', verfiyForgotPasswordOtp);


export default router; 
