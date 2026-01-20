import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Solution } from '../solutions/entities/solution.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Comment, User, Post, Solution])],
    controllers: [CommentsController],
    providers: [CommentsService],
})
export class CommentsModule { }
