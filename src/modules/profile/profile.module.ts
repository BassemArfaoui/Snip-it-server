import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CollectionItem } from '../collections/entities/item.entity';
import { Solution } from '../solutions/entities/solution.entity';
import { Comment } from '../comments/entities/comment.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Post, Issue, Subscription, Collection, CollectionItem, Solution, Comment]),
    CommonModule,
  ],
  providers: [ProfileService],
  controllers: [ProfileController],
  exports: [ProfileService]
})
export class ProfileModule {}
