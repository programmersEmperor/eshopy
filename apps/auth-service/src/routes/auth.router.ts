import { Router } from "express";
import { userRegisteration } from "../controller/auth.controller";

const router = Router();
router.post('/user-registeration', userRegisteration)

export default router; 
