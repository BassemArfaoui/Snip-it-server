import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestedPost } from './entities/suggested-post.entity';

@Injectable()
export class SuggestedPostsService {
    constructor(
        @InjectRepository(SuggestedPost)
        private readonly suggestedRepo: Repository<SuggestedPost>,
    ) {}

    async getSuggestionsForUser(userId: number): Promise<SuggestedPost[]> {
        return this.suggestedRepo.find({
            where: { user: { id: userId } },
            relations: ['post'],
            order: { createdAt: 'DESC' },
        });
    }
}
