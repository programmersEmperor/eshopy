import { Router } from "express";
import { loginUser, userForgotPassword, userRegisteration, verfiyForgotPasswordOtp, verifyUser, resetPasswordUser, refreshToken, getUser, sellerRegistration, verifySeller, sellerForgotPassword, createShop, createStripeConnectLink, loginSeller, getSeller } from "../controller/auth.controller";
import isAuthenticated from "../../../../packages/middleware/isAuthenticated";
import { isSeller } from "../../../../packages/middleware/authorizeRoles";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)
router.post('/login-user', loginUser)
router.post('/forgot-password-user', userForgotPassword);
router.post('/verify-forgot-password-user', verfiyForgotPasswordOtp);
router.post('/reset-password-user', resetPasswordUser);
router.post('/refresh-token-user' , refreshToken);
router.get('/logged-in-user', isAuthenticated, getUser);

router.post('/seller-registeration', sellerRegistration)
router.post('/forgot-password-seller', sellerForgotPassword);
router.post('/verify-seller', verifySeller)
router.post('/create-shop', createShop);
router.post('/create-stripe-link', createStripeConnectLink);
router.post('/login-seller', loginSeller);
router.get('/logged-in-seller', isAuthenticated, isSeller, getSeller);


export default router; 
 