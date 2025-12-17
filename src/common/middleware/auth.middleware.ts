import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../entities/jwt-payload.entity';
import { JwtService } from '../services/jwt.service';


@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid token');
        }

        const token = authHeader.split(' ')[1];

        const decoded = this.jwtService.verifyAccessToken(token) as JwtPayload;

        if (!decoded || !decoded.sub || !decoded.username || !decoded.email) {
            throw new UnauthorizedException('Invalid token payload');
        }

        req['user'] = {
            userId: decoded.sub,
            username: decoded.username,
            email: decoded.email,
        };

        next();
    }
}
