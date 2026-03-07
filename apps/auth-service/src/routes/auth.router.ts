import { Router } from "express";
import { loginUser, userForgotPassword, userRegisteration, verfiyForgotPasswordOtp, verifyUser, resetPasswordUser, refreshToken, getUser } from "../controller/auth.controller";
import isAuthenticated from "../../../../packages/middleware/isAuthenticated";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)
router.post('/login-user', loginUser)
router.post('/forgot-password-user', userForgotPassword);
router.post('/verify-forgot-password-user', verfiyForgotPasswordOtp);
router.post('/reset-password-user', resetPasswordUser);
router.post('/refresh-token-user' , refreshToken);
router.get('/logged-in-user', isAuthenticated, getUser);

export default router; 
 