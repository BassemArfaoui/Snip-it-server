import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { type SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../entities/jwt-payload.entity';

@Injectable()
export class JwtService {
    constructor(private readonly configService: ConfigService) { }

    private get accessSecret(): string {
        return this.configService.get<string>('JWT_ACCESS_SECRET', 'access-secret');
    }

    private get refreshSecret(): string {
        return this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret');
    }

    private get accessExpiresIn(): string {
        return this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    }

    private get refreshExpiresIn(): string {
        return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    }

    signAccessToken(payload: JwtPayload): string {
        const options: SignOptions = { expiresIn: this.accessExpiresIn as any };
        return jwt.sign(payload, this.accessSecret, options);
    }

    signRefreshToken(payload: JwtPayload): string {
        const options: SignOptions = { expiresIn: this.refreshExpiresIn as any };
        return jwt.sign(payload, this.refreshSecret, options);
    }

    verifyAccessToken(token: string): JwtPayload {
        return this.verifyToken(token, this.accessSecret);
    }

    verifyRefreshToken(token: string): JwtPayload {
        return this.verifyToken(token, this.refreshSecret);
    }

    private verifyToken(token: string, secret: string): JwtPayload {
        try {
            return jwt.verify(token, secret, {}) as unknown as JwtPayload;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
