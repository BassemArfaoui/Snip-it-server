import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuggestedPostsService } from './suggested_posts.service';
import { SuggestedPostsController } from './suggested_posts.controller';
import { SuggestedPost } from './entities/suggested_post.entity';
import { Post } from '../posts/entities/post.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SuggestedPost, Post])],
    providers: [SuggestedPostsService],
    controllers: [SuggestedPostsController],
    exports: [SuggestedPostsService],
})
export class SuggestedPostsModule { }
