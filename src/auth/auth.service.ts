import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

import { HashingService } from '../common/services/hashing.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private hashingService: HashingService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, username, password } = registerDto;

        const existingEmail = await this.usersService.findOneByEmail(email);
        if (existingEmail) {
            throw new BadRequestException('Email already exists');
        }

        const existingUsername = await this.usersService.findOneByUsername(username);
        if (existingUsername) {
            throw new BadRequestException('Username already exists');
        }

        const hashedPassword = await this.hashingService.hash(password);

        return this.usersService.create({
            ...registerDto,
            password: hashedPassword,
        });
    }
}
