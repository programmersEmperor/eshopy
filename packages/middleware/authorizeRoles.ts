import { NextFunction, Response } from "express";
import { AuthError } from "../error-handler";
import { UserRoles } from "../types";

export const isSeller = (req: any, res: Response, next: NextFunction) => {
    if (req.role !== UserRoles.Seller) next(new AuthError('Access denied! Sellers only'));
    return next();
}

export const isUser = (req: any, res: Response, next: NextFunction) => {
    if (req.role !== UserRoles.User) next(new AuthError('Access denied! Users only'));
    return next();
}