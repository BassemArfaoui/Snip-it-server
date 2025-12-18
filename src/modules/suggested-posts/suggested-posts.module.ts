import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuggestedPost } from './entities/suggested-post.entity';
import { SuggestedPostsService } from './suggested-posts.service';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { SuggestedPostsController } from './suggested-posts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SuggestedPost, User, Post])],
    providers: [SuggestedPostsService],
    controllers: [SuggestedPostsController],
    exports: [SuggestedPostsService],
})
export class SuggestedPostsModule {}
