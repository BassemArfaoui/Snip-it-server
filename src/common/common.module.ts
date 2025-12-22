import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HashingService } from './services/hashing.service';
import { JwtService } from './services/jwt.service';
import { VotingService } from './services/voting.service';

import { VotesController } from './controllers/votes.controller';
import { Vote } from './entities/vote.entity';
import { User } from '../modules/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Vote, User]),
  ],
  controllers: [VotesController],
  providers: [
    HashingService,
    JwtService,
    VotingService,
  ],
  exports: [
    HashingService,
    JwtService,
    VotingService,
  ],
})
export class CommonModule {}
