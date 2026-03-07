import { NextFunction, Response } from "express";
import { AuthError } from "../error-handler";
import jwt from 'jsonwebtoken';
import { prisma } from "../libs/prisma";

enum UserType {
    User = 'user',
    Seller = 'seller'
}

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
    try {

        const token = req.cookies.access_token;
        if(!token) throw new AuthError('Unauthorized! Token not found');

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {id: string, role: UserType};
        if(!decodedToken) throw new AuthError('Unauthorized! Token not found');
        
        const presistedUser = await prisma.users.findUnique({
            where: {
                id: decodedToken.id,
            }
        })
        if(!presistedUser) throw new AuthError('Unauthorized! User/Seller not found');
        
        req.user = presistedUser;
        next(); 
    }
    catch(e: any){
        return next(new AuthError(e.message))
    }
}

export default isAuthenticated;