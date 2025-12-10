import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { HashingService } from '../common/services/hashing.service';
import { JwtService } from '../common/services/jwt.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private hashingService: HashingService,
        private jwtService: JwtService,
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

    async login(loginDto: LoginDto) {
        const { identifier, password } = loginDto;

        const user = await this.usersService.findOneByEmailOrUsername(identifier);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.hashingService.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign({ userId: user.id, username: user.username, email: user.email });
        return { accessToken: token, user };
    }
}
