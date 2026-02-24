import { Request, Response } from "express";
import { AppError } from ".";

export function errorMiddleware(error: Error, request: Request, response: Response){
    
    if(error instanceof AppError){
        console.log(`Error ${request.method} - ${request.url} - ${error.message}`)
        return response.status(error.statusCode).json({
                status: 'error',
                message: error.message,   
                ...(error.details ? {details: error.details}: {})
        })
    }

    console.log('unhandled error:', error);
    return response.status(500).json({
        status: 'error',
        message: 'Something went wrong, please try again!'
    })

}