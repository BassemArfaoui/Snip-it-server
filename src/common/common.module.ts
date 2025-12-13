import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HashingService } from './services/hashing.service';
import { JwtService } from './services/jwt.service';

@Module({
    imports: [ConfigModule],
    providers: [HashingService, JwtService],
    exports: [HashingService, JwtService],
})
export class CommonModule { }
