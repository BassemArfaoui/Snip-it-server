import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestedPost } from './entities/suggested-post.entity';
import { PaginatedResult, PaginationParams, paginate } from '../../common/utils/pagination';

@Injectable()
export class SuggestedPostsService {
    constructor(
        @InjectRepository(SuggestedPost)
        private readonly suggestedRepo: Repository<SuggestedPost>,
    ) {}

    async getSuggestionsForUser(userId: number, pagination: PaginationParams): Promise<PaginatedResult<SuggestedPost>> {
        return paginate(this.suggestedRepo, pagination, {
            where: { user: { id: userId } },
            relations: ['post'],
            order: { createdAt: 'DESC' },
        });
    }
}
