import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async follow(targetUserId: number, subscriberId: number) {
    if (targetUserId === subscriberId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const [targetUser, subscriber] = await Promise.all([
      this.usersRepo.findOne({ where: { id: targetUserId } }),
      this.usersRepo.findOne({ where: { id: subscriberId } }),
    ]);

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }
    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    const alreadyFollowing = await this.subscriptionsRepo.findOne({
      where: {
        subscriber: { id: subscriberId },
        targetUser: { id: targetUserId },
      },
    });

    if (!alreadyFollowing) {
      const subscription = this.subscriptionsRepo.create({
        subscriber: { id: subscriberId } as User,
        targetUser: { id: targetUserId } as User,
      });
      await this.subscriptionsRepo.save(subscription);
    }

    const counts = await this.refreshCounts(subscriberId, targetUserId);
    return { status: 'followed', ...counts };
  }

  async unfollow(targetUserId: number, subscriberId: number) {
    const existing = await this.subscriptionsRepo.findOne({
      where: {
        subscriber: { id: subscriberId },
        targetUser: { id: targetUserId },
      },
    });

    if (existing) {
      await this.subscriptionsRepo.delete(existing.id);
    }

    const counts = await this.refreshCounts(subscriberId, targetUserId);
    return { status: 'unfollowed', ...counts };
  }

  private async refreshCounts(subscriberId: number, targetUserId: number) {
    const [followersCount, followingCount] = await Promise.all([
      this.subscriptionsRepo.count({ where: { targetUser: { id: targetUserId } } }),
      this.subscriptionsRepo.count({ where: { subscriber: { id: subscriberId } } }),
    ]);

    await Promise.all([
      this.usersRepo.update({ id: targetUserId }, { subscriberCount: followersCount }),
      this.usersRepo.update({ id: subscriberId }, { followingCount }),
    ]);

    return { followers: followersCount, following: followingCount };
  }

  // Remove all subscriptions where the user is subscriber or target
  async removeForUser(userId: number): Promise<void> {
    await this.subscriptionsRepo
      .createQueryBuilder()
      .delete()
      .where('"subscriberId" = :id OR "targetUserId" = :id', { id: userId })
      .execute();
  }
}
