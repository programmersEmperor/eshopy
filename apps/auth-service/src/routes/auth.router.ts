import { Router } from "express";
import { loginUser, userRegisteration, verifyUser } from "../controller/auth.controller";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)
router.post('/login', loginUser)

export default router; 
