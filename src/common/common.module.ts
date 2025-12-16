import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HashingService } from './services/hashing.service';
import { JwtService } from './services/jwt.service';
import { VotingService } from './services/voting.service';
import { VotesController } from './controllers/votes.controller';
import { Vote } from './entities/vote.entity';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
    imports: [TypeOrmModule.forFeature([Vote])],
    controllers: [VotesController],
    providers: [
        HashingService,
        JwtService,
        VotingService,
        ResponseInterceptor,
        HttpExceptionFilter,
    ],
    exports: [
        HashingService,
        JwtService,
        VotingService,
        ResponseInterceptor,
        HttpExceptionFilter,
    ],
})
export class CommonModule { }
