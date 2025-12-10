import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
    private readonly secret = process.env.JWT_SECRET || 'secret';

    sign(payload: object): string {
        return jwt.sign(payload, this.secret);
    }

    verify(token: string): any {
        try {
            return jwt.verify(token, this.secret);
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}
