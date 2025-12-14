import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../../common/common.module';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConsoleEmailProvider, EMAIL_PROVIDER_TOKEN } from './providers/email.provider';

@Module({
    imports: [UsersModule, CommonModule, PassportModule.register({ defaultStrategy: 'jwt' }), TypeOrmModule.forFeature([User, EmailVerification, PasswordReset])],
    providers: [AuthService, JwtStrategy, { provide: EMAIL_PROVIDER_TOKEN, useClass: ConsoleEmailProvider }],
    controllers: [AuthController],
})
export class AuthModule { }
