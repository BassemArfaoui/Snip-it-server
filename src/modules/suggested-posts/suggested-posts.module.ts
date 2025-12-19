import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuggestedPost } from './entities/suggested-post.entity';
import { SuggestedPostsService } from './suggested-posts.service';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { SuggestedPostsController } from './suggested-posts.controller';
import { Interaction } from '../interactions/entities/interaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SuggestedPost, User, Post, Interaction])],
    providers: [SuggestedPostsService],
    controllers: [SuggestedPostsController],
    exports: [SuggestedPostsService],
})
export class SuggestedPostsModule {}
