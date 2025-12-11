import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestedPost } from './entities/suggested_post.entity';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class SuggestedPostsService {
    constructor(
        @InjectRepository(SuggestedPost)
        private readonly suggestedRepo: Repository<SuggestedPost>,
        @InjectRepository(Post)
        private readonly postRepo: Repository<Post>,
    ) { }

    async getSuggestedPosts(userId: number): Promise<Post[]> {
        return this.postRepo.find();
    }
}
