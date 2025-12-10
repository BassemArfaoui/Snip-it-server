import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService) { }

    async register(registerDto: RegisterDto) {
        const { email, username } = registerDto;

        const existingEmail = await this.usersService.findOneByEmail(email);
        if (existingEmail) {
            throw new BadRequestException('Email already exists');
        }

        const existingUsername = await this.usersService.findOneByUsername(username);
        if (existingUsername) {
            throw new BadRequestException('Username already exists');
        }


        return this.usersService.create(registerDto);
    }
}
