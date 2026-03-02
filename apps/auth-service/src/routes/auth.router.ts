import { Router } from "express";
import { userRegisteration, verifyUser } from "../controller/auth.controller";

const router = Router();
router.post('/user-registeration', userRegisteration)
router.post('/verify-user', verifyUser)

export default router; 
