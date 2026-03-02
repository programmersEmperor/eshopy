import { Router } from "express";
import { loginUser, userForgetPassword, userRegisteration, verifyUser } from "../controller/auth.controller";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)
router.post('/login', loginUser)
router.post('/forget-password', userForgetPassword)

export default router; 
