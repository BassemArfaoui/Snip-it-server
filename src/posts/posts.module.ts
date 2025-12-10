import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostsController } from './posts.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Post])],
    controllers: [PostsController],
})
export class PostsModule { }
