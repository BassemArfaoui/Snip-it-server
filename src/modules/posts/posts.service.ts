import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Snippet } from '../snippet/entities/snippet.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatedResult, PaginationParams, paginate } from '../../common/utils/pagination';
import { Interaction } from '../interactions/entities/interaction.entity';
import { InteractionTargetType } from '../../common/enums/interaction-target-type.enum';
import { ReactionTypeEnum } from '../../common/enums/reaction-emoji.enum';

//! todo : remove the any types in this file
@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post) private readonly postRepo: Repository<Post>,
        @InjectRepository(Snippet) private readonly snippetRepo: Repository<Snippet>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Interaction) private readonly interactionRepo: Repository<Interaction>,
    ) {}



    //note to me in the future : this might look complicated but it's just to get the interactions counts and if the user reacted before efficiently
    async findPaginated(params: PaginationParams, requesterId: number): Promise<PaginatedResult<Post>> {
        // Include soft-deleted posts in feed only for admin users (match profile behavior)
        const requester = await this.userRepo.findOne({ where: { id: requesterId } });
        const includeDeleted = !!(requester && (requester.role || '').toString().toLowerCase() === 'admin');

        const findOptions: any = {
            relations: ['author', 'snippet'],
            order: { createdAt: 'DESC' },
        };

        if (!includeDeleted) {
            findOptions.where = { isDeleted: false };
        } else {
            // allow fetching deleted rows
            findOptions.withDeleted = true as any;
        }

        const result = await paginate(this.postRepo, params, findOptions);

        const postIds = result.data.map(p => p.id).filter(Boolean);
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
                userId: requesterId,
                targetType: InteractionTargetType.POST,
                targetId: In(postIds),
            },
        });

        for (const interaction of myInteractions) {
            myTypeByPostId.set(interaction.targetId, interaction.type);
        }

        for (const post of result.data as any[]) {
            const counts = countsByPostId.get(post.id) ?? {};

            const interactions: any = { total: 0 };
            for (const type of reactionTypes) {
                const c = counts[type] ?? 0;
                interactions[type] = c;
                interactions.total += c;
            }

            const myType = myTypeByPostId.get(post.id) ?? null;
            interactions.didInteract = Boolean(myType);
            interactions.myType = myType;

            post.interactions = interactions;
        }

        return result;
    }

    async findOne(id: number): Promise<Post> {
        const post = await this.postRepo.findOne({
            where: { id, isDeleted: false },
            relations: ['author', 'snippet'],
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        return post;
    }

    async findOneWithInteractions(id: number, requesterId: number): Promise<Post> {
        // Allow admins to see soft-deleted posts
        const requester = await this.userRepo.findOne({ where: { id: requesterId } });
        const includeDeleted = !!(requester && (requester.role || '').toString().toLowerCase() === 'admin');

        let post: any;
        if (includeDeleted) {
            post = await this.postRepo.findOne({ where: { id }, relations: ['author', 'snippet'], withDeleted: true as any });
            if (!post) throw new NotFoundException('Post not found');
        } else {
            post = await this.findOne(id);
        }

        const reactionTypes = Object.values(ReactionTypeEnum);

        const rows = await this.interactionRepo
            .createQueryBuilder('i')
            .select('i.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('i.targetType = :targetType', { targetType: InteractionTargetType.POST })
            .andWhere('i.targetId = :postId', { postId: id })
            .groupBy('i.type')
            .getRawMany<{ type: ReactionTypeEnum; count: string }>();

        const counts: Partial<Record<ReactionTypeEnum, number>> = {};
        for (const row of rows) {
            counts[row.type] = Number(row.count);
        }

        const myInteraction = await this.interactionRepo.findOne({
            where: {
                userId: requesterId,
                targetType: InteractionTargetType.POST,
                targetId: id,
            },
        });

        const interactions: any = { total: 0 };
        for (const type of reactionTypes) {
            const c = counts[type] ?? 0;
            interactions[type] = c;
            interactions.total += c;
        }

        interactions.didInteract = Boolean(myInteraction);
        interactions.myType = myInteraction?.type ?? null;

        post.interactions = interactions;
        return post;
    }

    async findOneShare(id: number): Promise<Post> {
        const post: any = await this.findOne(id);

        const reactionTypes = Object.values(ReactionTypeEnum);

        const rows = await this.interactionRepo
            .createQueryBuilder('i')
            .select('i.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('i.targetType = :targetType', { targetType: InteractionTargetType.POST })
            .andWhere('i.targetId = :postId', { postId: id })
            .groupBy('i.type')
            .getRawMany<{ type: ReactionTypeEnum; count: string }>();

        const counts: Partial<Record<ReactionTypeEnum, number>> = {};
        for (const row of rows) {
            counts[row.type] = Number(row.count);
        }

        const interactions: any = { total: 0 };
        for (const type of reactionTypes) {
            const c = counts[type] ?? 0;
            interactions[type] = c;
            interactions.total += c;
        }

        interactions.didInteract = false;
        interactions.myType = null;

        post.interactions = interactions;
        return post;
    }

    async create(authorId: number, dto: CreatePostDto): Promise<Post> {
        const author = await this.userRepo.findOne({ where: { id: authorId } });
        if (!author) {
            throw new UnauthorizedException('Author not found');
        }

        const snippet = this.snippetRepo.create({
            title: dto.snippetTitle,
            content: dto.snippetContent,
            language: dto.snippetLanguage,
        });
        await this.snippetRepo.save(snippet);

        const post = this.postRepo.create({
            title: dto.title,
            description: dto.description,
            githubLink: dto.githubLink,
            author,
            snippet,
        });

        return this.postRepo.save(post);
    }

    async update(id: number, requesterId: number, dto: UpdatePostDto): Promise<Post> {
        const post = await this.postRepo.findOne({ where: { id, isDeleted: false }, relations: ['author', 'snippet'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author?.id !== requesterId) {
            // Allow admins to edit other users' posts
            const requester = await this.userRepo.findOne({ where: { id: requesterId } });
            const isAdmin = !!requester && (requester.role || '').toString().toLowerCase() === 'admin';
            if (!isAdmin) {
                throw new ForbiddenException('You are not the owner');
            }
        }

        if (dto.title !== undefined) post.title = dto.title;
        if (dto.description !== undefined) post.description = dto.description;
        if (dto.githubLink !== undefined) post.githubLink = dto.githubLink;

        if (dto.snippetContent !== undefined) post.snippet.content = dto.snippetContent;
        if (dto.snippetLanguage !== undefined) post.snippet.language = dto.snippetLanguage;
        if (dto.snippetTitle !== undefined) post.snippet.title = dto.snippetTitle;

        await this.snippetRepo.save(post.snippet);
        return this.postRepo.save(post);
    }

    async delete(id: number, requesterId: number): Promise<void> {
        const post = await this.postRepo.findOne({ where: { id, isDeleted: false }, relations: ['author', 'snippet'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author?.id !== requesterId) {
            throw new ForbiddenException('You are not the owner');
        }

        await this.postRepo.update({ id }, { isDeleted: true, deletedAt: new Date() });

        if (post.snippet?.id) {
            await this.snippetRepo.update({ id: post.snippet.id }, { isDeleted: true, deletedAt: new Date() });
        }
    }

    // Admin: delete any post
    async adminDelete(id: number): Promise<void> {
        // allow admin to delete regardless of current isDeleted state
        const post = await this.postRepo.findOne({ where: { id }, relations: ['snippet'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        await this.postRepo.update({ id }, { isDeleted: true, deletedAt: new Date() });

        if (post.snippet?.id) {
            await this.snippetRepo.update({ id: post.snippet.id }, { isDeleted: true, deletedAt: new Date() });
        }
    }

    // Admin: restore a deleted post
    async adminRestore(id: number): Promise<void> {
        // include soft-deleted rows in the lookup in case DeleteDateColumn/soft-delete is used
        const post = await this.postRepo.findOne({ where: { id }, relations: ['snippet'], withDeleted: true as any });
        if (!post) {
            console.warn(`[PostsService] adminRestore: post id=${id} not found (withDeleted search)`);
            throw new NotFoundException('Post not found');
        }

        // set fields on entity and save so TypeORM properly persists DeleteDateColumn and related fields
        post.isDeleted = false;
        (post as any).deletedAt = null;
        await this.postRepo.save(post);

        if (post.snippet?.id) {
            post.snippet.isDeleted = false as any;
            (post.snippet as any).deletedAt = null;
            await this.snippetRepo.save(post.snippet);
        }
    }
}
