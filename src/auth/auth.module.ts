import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [UsersModule, CommonModule],
    providers: [AuthService],
    controllers: [AuthController],
})
export class AuthModule { }
