import { NextFunction, Response } from "express";
import { AuthError } from "../error-handler";
import jwt from 'jsonwebtoken';
import { prisma } from "../libs/prisma";
import { UserRoles } from "../types";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
    try {

        const token = req.cookies['access-token'] || req.cookies['seller-access-token'] || req.headers.authorization?.split(' ')[1];
        if(!token) throw new AuthError('Unauthorized! Token not found');

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {id: string, role: UserRoles};
        if(!decodedToken) throw new AuthError('Unauthorized! Token not found');
        
        if(decodedToken.role === UserRoles.Seller){
            const presistedSeller = await prisma.sellers.findUnique({
                where: {
                    id: decodedToken.id,
                }
            })
            if(!presistedSeller) throw new AuthError('Unauthorized! Seller not found');
            req.seller = presistedSeller;
            return next();
        }


        const presistedUser = await prisma.users.findUnique({
            where: {
                id: decodedToken.id,
            }
        })
        if(!presistedUser) throw new AuthError('Unauthorized! User/Seller not found');
        
        req.user = presistedUser;
        return next(); 
    }
    catch(e: any){
        return next(new AuthError(e.message))
    }
}

export default isAuthenticated;