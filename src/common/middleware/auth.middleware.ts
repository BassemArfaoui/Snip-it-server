import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../entities/jwt-payload.entity';
import * as jwt from 'jsonwebtoken';


@Injectable()
export class AuthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid token');
        }

        const token = authHeader.split(' ')[1];

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error('Missing Jwt Secret');
                throw new Error('Internal server error');
            }

            const decoded = jwt.verify(token, secret) as JwtPayload;


            if (!decoded || !decoded.userId || !decoded.username || !decoded.email) {
                throw new UnauthorizedException('Invalid token payload');
            }
            req['user'] = {
                userId: decoded.userId,
                username: decoded.username,
                email: decoded.email,
            };


            next();
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
