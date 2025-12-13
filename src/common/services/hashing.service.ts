import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashingService {
    private readonly saltRounds: number;

    constructor(configService: ConfigService) {
        this.saltRounds = Number(configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
    }

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
