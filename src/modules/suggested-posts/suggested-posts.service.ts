import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SuggestedPost } from './entities/suggested-post.entity';
import { PaginatedResult, PaginationParams, paginate } from '../../common/utils/pagination';
import { Interaction } from '../interactions/entities/interaction.entity';
import { InteractionTargetType } from '../../common/enums/interaction-target-type.enum';
import { ReactionTypeEnum } from '../../common/enums/reaction-emoji.enum';


//! todo : remove the any types in this file

@Injectable()
export class SuggestedPostsService {
    constructor(
        @InjectRepository(SuggestedPost)
        private readonly suggestedRepo: Repository<SuggestedPost>,

        @InjectRepository(Interaction)
        private readonly interactionRepo: Repository<Interaction>,
    ) {}

    async getSuggestionsForUser(userId: number, pagination: PaginationParams): Promise<PaginatedResult<SuggestedPost>> {
        const result = await paginate(this.suggestedRepo, pagination, {
            where: { user: { id: userId }, post: { isDeleted: false } },
            relations: ['post', 'post.author', 'post.snippet'],
            order: { createdAt: 'DESC' },
        });

        const postIds = result.data
            .map(sp => sp.post?.id)
            .filter((id): id is number => typeof id === 'number');

        if (!postIds.length) {
            return result;
        }

        const reactionTypes = Object.values(ReactionTypeEnum);

        const rows = await this.interactionRepo
            .createQueryBuilder('i')
            .select('i.targetId', 'targetId')
            .addSelect('i.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('i.targetType = :targetType', { targetType: InteractionTargetType.POST })
            .andWhere('i.targetId IN (:...postIds)', { postIds })
            .groupBy('i.targetId')
            .addGroupBy('i.type')
            .getRawMany<{ targetId: string; type: ReactionTypeEnum; count: string }>();

        const countsByPostId = new Map<number, Partial<Record<ReactionTypeEnum, number>>>();
        for (const row of rows) {
            const targetId = Number(row.targetId);
            const type = row.type as ReactionTypeEnum;
            const count = Number(row.count);

            const current = countsByPostId.get(targetId) ?? {};
            current[type] = count;
            countsByPostId.set(targetId, current);
        }

        const myTypeByPostId = new Map<number, ReactionTypeEnum>();
        const myInteractions = await this.interactionRepo.find({
            where: {
                userId,
                targetType: InteractionTargetType.POST,
                targetId: In(postIds),
            },
        });

        for (const interaction of myInteractions) {
            myTypeByPostId.set(interaction.targetId, interaction.type);
        }

        for (const sp of result.data as any[]) {
            const postId = sp.post?.id;
            if (!postId) {
                continue;
            }

            const counts = countsByPostId.get(postId) ?? {};
            const interactions: any = { total: 0 };

            for (const type of reactionTypes) {
                const c = counts[type] ?? 0;
                interactions[type] = c;
                interactions.total += c;
            }

            const myType = myTypeByPostId.get(postId) ?? null;
            interactions.didInteract = Boolean(myType);
            interactions.myType = myType;

            sp.post.interactions = interactions;
        }

        return result;
    }
}
