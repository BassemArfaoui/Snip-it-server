import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Snippet } from '../snippet/entities/snippet.entity';
import { User } from '../users/entities/user.entity';
import { Interaction } from '../interactions/entities/interaction.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
    imports: [TypeOrmModule.forFeature([Post, Snippet, User, Interaction])],
    controllers: [PostsController],
    providers: [PostsService],
    exports: [PostsService],
})
export class PostsModule { }
