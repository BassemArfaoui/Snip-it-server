import { Controller, Delete, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../issues/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post(':targetUserId')
  follow(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.follow(targetUserId, user.id);
  }

  @Delete(':targetUserId')
  unfollow(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @CurrentUser() user: User,
  ) {
    return this.service.unfollow(targetUserId, user.id);
  }
}
