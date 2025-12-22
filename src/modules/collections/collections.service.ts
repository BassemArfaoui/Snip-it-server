import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/item.entity';
import { User } from '../users/entities/user.entity';
import { CollectionItemEnum } from '../../common/enums/collection-item.enum';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Solution } from '../solutions/entities/solution.entity';
import { PrivateSnippet } from '../private-snippets/entities/private-snippet.entity';
import * as crypto from 'crypto';

@Injectable()
export class CollectionsService {
    constructor(
        @InjectRepository(Collection) private collectionRepo: Repository<Collection>,
        @InjectRepository(CollectionItem) private itemRepo: Repository<CollectionItem>,
        @InjectRepository(Post) private postRepo: Repository<Post>,
        @InjectRepository(Issue) private issueRepo: Repository<Issue>,
        @InjectRepository(Solution) private solutionRepo: Repository<Solution>,
        @InjectRepository(PrivateSnippet) private privateSnippetRepo: Repository<PrivateSnippet>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    async createCollection(user: User, name: string, isPublic = false, allowEdit = false) {
        const collection = this.collectionRepo.create({ 
            user, 
            name, 
            isPublic, 
            allowEdit 
        });
        if (isPublic) collection.shareToken = this.generateToken();
        const saved = await this.collectionRepo.save(collection);
        
        // Return without loading the full user relation to avoid exposing sensitive data
        const { user: _, ...collectionData } = saved;
        return collectionData;
    }

    async updateCollection(user: User, id: number, patch: Partial<Collection>) {
        const coll = await this.collectionRepo.findOne({ where: { id, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');
        Object.assign(coll, patch);
        if (patch.isPublic === true && !coll.shareToken) coll.shareToken = this.generateToken();
        if (patch.isPublic === false) coll.shareToken = undefined;
        return this.collectionRepo.save(coll);
    }

    async deleteCollection(user: User, id: number) {
        const coll = await this.collectionRepo.findOne({ where: { id, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');
        return this.collectionRepo.softRemove(coll);
    }

    async getUserCollections(user: User, opts: { page?: number; size?: number; q?: string } = {}) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);
        
        const qb = this.collectionRepo.createQueryBuilder('collection')
            .where('collection.userId = :userId', { userId: user.id })
            .leftJoinAndSelect('collection.items', 'items');
        
        if (opts.q) {
            qb.andWhere('collection.name ILIKE :q', { q: `%${opts.q}%` });
        }
        
        const [collections, total] = await qb.skip((page - 1) * size).take(size).getManyAndCount();
        
        const totalItems = collections.reduce((acc, c) => acc + (c.items?.length ?? 0), 0);
        const mapped = collections.map(c => ({
            ...c,
            itemsCount: c.items?.length ?? 0,
            lastModified: c.items && c.items.length ? c.items.reduce((max, it) => it.updatedAt > max ? it.updatedAt : max, c.items[0].updatedAt) : c.updatedAt,
            stats: this.buildStats(c.items ?? []),
        }));
        return { totalCollections: total, totalItems, page, size, collections: mapped };
    }

    async getCollectionById(user: User, id: number) {
        const coll = await this.collectionRepo.findOne({ where: { id, user: { id: user.id } }, relations: ['items'] });
        if (!coll) throw new NotFoundException('Collection not found');
        return {
            ...coll,
            itemsCount: coll.items?.length ?? 0,
            lastModified: coll.items && coll.items.length ? coll.items.reduce((max, it) => it.updatedAt > max ? it.updatedAt : max, coll.items[0].updatedAt) : coll.updatedAt,
            stats: this.buildStats(coll.items ?? []),
        };
    }

    async getCollectionByToken(token: string) {
        const coll = await this.collectionRepo.findOne({ where: { shareToken: token }, relations: ['items'] });
        if (!coll) throw new NotFoundException('Collection not found');
        return coll;
    }

    async addItemToCollection(user: User, collectionId: number, targetId: number, targetType: CollectionItemEnum, pinned = false, favorite = false) {
        const coll = await this.collectionRepo.findOne({ where: { id: collectionId, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');

        // check target exists
        await this.ensureTargetExists(targetType, targetId);

        // prevent duplicates
        const existing = await this.itemRepo.findOne({ where: { collection: { id: collectionId }, targetId, targetType } });
        if (existing) throw new BadRequestException('Item already saved in collection');

        const item = this.itemRepo.create({ collection: coll, targetId, targetType, isPinned: pinned, isFavorite: favorite });
        return this.itemRepo.save(item);
    }

    async removeItem(user: User, collectionId: number, targetId: number, targetType: CollectionItemEnum) {
        const coll = await this.collectionRepo.findOne({ where: { id: collectionId, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');
        const item = await this.itemRepo.findOne({ where: { collection: { id: collectionId }, targetId, targetType } });
        if (!item) throw new NotFoundException('Item not found in collection');
        return this.itemRepo.softRemove(item);
    }

    async moveItem(user: User, collectionId: number, targetId: number, targetType: CollectionItemEnum, destCollectionId: number) {
        const src = await this.collectionRepo.findOne({ where: { id: collectionId, user: { id: user.id } } });
        const dest = await this.collectionRepo.findOne({ where: { id: destCollectionId, user: { id: user.id } } });
        if (!src || !dest) throw new NotFoundException('Source or destination collection not found');
        const item = await this.itemRepo.findOne({ where: { collection: { id: collectionId }, targetId, targetType } });
        if (!item) throw new NotFoundException('Item not found in source collection');
        item.collection = dest;
        return this.itemRepo.save(item);
    }

    async toggleFavorite(user: User, collectionId: number, targetId: number, targetType: CollectionItemEnum, value: boolean) {
        const coll = await this.collectionRepo.findOne({ where: { id: collectionId, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');
        const item = await this.itemRepo.findOne({ where: { collection: { id: collectionId }, targetId, targetType } });
        if (!item) throw new NotFoundException('Item not found');
        item.isFavorite = value;
        return this.itemRepo.save(item);
    }

    async listItems(user: User, collectionId: number, opts: { page?: number, size?: number, type?: CollectionItemEnum, language?: string, q?: string, sort?: string }) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);
        const coll = await this.collectionRepo.findOne({ where: { id: collectionId, user: { id: user.id } } });
        if (!coll) throw new NotFoundException('Collection not found');

        const qb = this.itemRepo.createQueryBuilder('item').where('item.collectionId = :cid', { cid: collectionId });
        if (opts.type) qb.andWhere('item.targetType = :type', { type: opts.type });
        if (typeof (opts as any).favorite === 'boolean') qb.andWhere('item.isFavorite = :fav', { fav: (opts as any).favorite });
        if (typeof (opts as any).pinned === 'boolean') qb.andWhere('item.isPinned = :pin', { pin: (opts as any).pinned });

        // language and search require joining target tables; implement simple post/issue search
        if (opts.language) {
            qb.andWhere('(item.targetType = :postType AND EXISTS(SELECT 1 FROM posts p WHERE p.id = item.targetId AND p.language = :lang)) OR (item.targetType = :issueType AND EXISTS(SELECT 1 FROM issues i WHERE i.id = item.targetId AND i.language = :lang))', { postType: CollectionItemEnum.POST, issueType: CollectionItemEnum.ISSUE, lang: opts.language });
        }

        if (opts.q) {
            qb.andWhere('(item.targetType = :postType AND EXISTS(SELECT 1 FROM posts p WHERE p.id = item.targetId AND (p.title ILIKE :q OR p.description ILIKE :q))) OR (item.targetType = :issueType AND EXISTS(SELECT 1 FROM issues i WHERE i.id = item.targetId AND i.content ILIKE :q))', { postType: CollectionItemEnum.POST, issueType: CollectionItemEnum.ISSUE, q: `%${opts.q}%` });
        }

        if (opts.sort === 'recent') qb.orderBy('item.createdAt', 'DESC');
        else if (opts.sort === 'favorite') qb.orderBy('item.isFavorite', 'DESC');
        else qb.orderBy('item.updatedAt', 'DESC');

        const [items, total] = await qb.skip((page - 1) * size).take(size).getManyAndCount();
        return { items, total, page, size };
    }

    private async ensureTargetExists(type: CollectionItemEnum, id: number) {
        if (type === CollectionItemEnum.POST) {
            const p = await this.postRepo.count({ where: { id } });
            if (!p) throw new NotFoundException('Post not found');
        } else if (type === CollectionItemEnum.ISSUE) {
            const v = await this.issueRepo.count({ where: { id } });
            if (!v) throw new NotFoundException('Issue not found');
        } else if (type === CollectionItemEnum.SOLUTION) {
            const v = await this.solutionRepo.count({ where: { id } });
            if (!v) throw new NotFoundException('Solution not found');
        } else if (type === CollectionItemEnum.PRIVATE_SNIPPET) {
            const v = await this.privateSnippetRepo.count({ where: { id } });
            if (!v) throw new NotFoundException('Private snippet not found');
        }
    }

    private generateToken() {
        return 'share_' + crypto.randomBytes(12).toString('hex');
    }

    private buildStats(items: CollectionItem[]) {
        const stats = {
            total: items.length,
            posts: 0,
            issues: 0,
            solutions: 0,
            privateSnippets: 0,
            favorites: 0,
            pinned: 0,
        };

        for (const it of items) {
            if (it.targetType === CollectionItemEnum.POST) stats.posts++;
            else if (it.targetType === CollectionItemEnum.ISSUE) stats.issues++;
            else if (it.targetType === CollectionItemEnum.SOLUTION) stats.solutions++;
            else if (it.targetType === CollectionItemEnum.PRIVATE_SNIPPET) stats.privateSnippets++;

            if (it.isFavorite) stats.favorites++;
            if (it.isPinned) stats.pinned++;
        }
        return stats;
    }
}
