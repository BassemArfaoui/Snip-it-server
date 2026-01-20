import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VotingService } from '../services/voting.service';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorator/current-user.decorator';
import { User } from '../../modules/users/entities/user.entity';

@Controller('votes')
export class VotesController {
  constructor(private readonly votingService: VotingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  async vote(@Body() dto: CreateVoteDto, @CurrentUser() user: User) {
    return this.votingService.vote(dto, user.id);
  }
}
