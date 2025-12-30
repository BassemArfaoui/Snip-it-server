import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/item.entity';
import { CollectionCollaborator } from './entities/collaborator.entity';
import { Tag } from '../tags/entities/tag.entity';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Solution } from '../solutions/entities/solution.entity';
import { PrivateSnippet } from '../private-snippets/entities/private-snippet.entity';
import { User } from '../users/entities/user.entity';
import { CollectionItemEnum } from '../../common/enums/collection-item.enum';
import { CollectionPermission } from '../../common/enums/collection-permission.enum';
import * as crypto from 'crypto';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@Injectable()
export class CollectionsService {
    constructor(
        @InjectRepository(Collection) private collectionRepo: Repository<Collection>,
        @InjectRepository(CollectionItem) private itemRepo: Repository<CollectionItem>,
        @InjectRepository(CollectionCollaborator) private collaboratorRepo: Repository<CollectionCollaborator>,
        @InjectRepository(Tag) private tagRepo: Repository<Tag>,
        @InjectRepository(Post) private postRepo: Repository<Post>,
        @InjectRepository(Issue) private issueRepo: Repository<Issue>,
        @InjectRepository(Solution) private solutionRepo: Repository<Solution>,
        @InjectRepository(PrivateSnippet) private privateSnippetRepo: Repository<PrivateSnippet>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    async createCollection(authUser: AuthUser, name: string, isPublic: boolean = false, allowEdit: boolean = false) {
        const user = await this.userRepo.findOne({ where: { id: Number(authUser.userId) } });
        if (!user) throw new NotFoundException('User not found');

        // Check if collection with same name already exists for this user
        const existing = await this.collectionRepo.findOne({
            where: { user: { id: user.id }, name },
        });
        if (existing) throw new BadRequestException(`Collection with name "${name}" already exists`);

        const collection = this.collectionRepo.create({
            name,
            user,
            isPublic,
            allowEdit,
            shareToken: isPublic ? crypto.randomBytes(16).toString('hex') : undefined,
        });
        const saved = await this.collectionRepo.save(collection);
        const { user: _, ...result } = saved;
        return result;
    }

    async getUserCollections(authUser: AuthUser, opts: { page?: number; size?: number; q?: string; tags?: string[] } = {}) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);

        const qb = this.collectionRepo.createQueryBuilder('c')
            .leftJoinAndSelect('c.tags', 'tags')
            .where('c.userId = :userId', { userId: authUser.userId });

        if (opts.q) {
            qb.andWhere('c.name ILIKE :q', { q: `%${opts.q}%` });
        }

        if (opts.tags && opts.tags.length > 0) {
            qb.andWhere('tags.name IN (:...tags)', { tags: opts.tags });
        }

        const [items, total] = await qb
            .skip((page - 1) * size)
            .take(size)
            .getManyAndCount();

        // Remove user data from all items
        const sanitizedItems = items.map(({ user, ...item }) => item);

        return { items: sanitizedItems, total, page, size };
    }

    async getCollectionById(authUser: AuthUser, id: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id },
            relations: ['user', 'items'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const { user: _, ...result } = collection;
        return result;
    }

    async updateCollection(authUser: AuthUser, id: number, payload: { name?: string; isPublic?: boolean; allowEdit?: boolean }) {
        const collection = await this.collectionRepo.findOne({ where: { id }, relations: ['user'] });
        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        // Check if new name conflicts with existing collection
        if (payload.name !== undefined && payload.name !== collection.name) {
            const existing = await this.collectionRepo.findOne({
                where: { user: { id: collection.user.id }, name: payload.name },
            });
            if (existing) throw new BadRequestException(`Collection with name "${payload.name}" already exists`);
        }

        if (payload.name !== undefined) collection.name = payload.name;
        if (payload.isPublic !== undefined) {
            collection.isPublic = payload.isPublic;
            if (payload.isPublic && !collection.shareToken) {
                collection.shareToken = crypto.randomBytes(16).toString('hex');
            }
        }
        if (payload.allowEdit !== undefined) collection.allowEdit = payload.allowEdit;

        const saved = await this.collectionRepo.save(collection);
        const { user: _, ...result } = saved;
        return result;
    }

    async deleteCollection(authUser: AuthUser, id: number) {
        const collection = await this.collectionRepo.findOne({ where: { id }, relations: ['user'] });
        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const removed = await this.collectionRepo.softRemove(collection);
        const { user: _, ...result } = removed;
        return result;
    }

    async addItemToCollection(
        authUser: AuthUser,
        collectionId: number,
        targetId: number,
        targetType: CollectionItemEnum,
        isPinned: boolean = false,
        isFavorite: boolean = false,
    ) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'items'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        // Check if item already exists
        const existing = collection.items.find(
            item => item.targetId === targetId && item.targetType === targetType,
        );
        if (existing) throw new BadRequestException('Item already exists in collection');

        const item = this.itemRepo.create({
            collection,
            targetId,
            targetType,
            isPinned,
            isFavorite,
        });

        return this.itemRepo.save(item);
    }

    async removeItem(authUser: AuthUser, collectionId: number, targetId: number, targetType: CollectionItemEnum) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'items'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const item = collection.items.find(
            i => i.targetId === targetId && i.targetType === targetType,
        );
        if (!item) throw new NotFoundException('Item not found');

        return this.itemRepo.remove(item);
    }

    async moveItem(
        authUser: AuthUser,
        sourceCollectionId: number,
        targetId: number,
        targetType: CollectionItemEnum,
        destinationCollectionId: number,
    ) {
        const [sourceCollection, destCollection] = await Promise.all([
            this.collectionRepo.findOne({
                where: { id: sourceCollectionId },
                relations: ['user', 'items'],
            }),
            this.collectionRepo.findOne({
                where: { id: destinationCollectionId },
                relations: ['user', 'items'],
            }),
        ]);

        if (!sourceCollection) throw new NotFoundException('Source collection not found');
        if (!destCollection) throw new NotFoundException('Destination collection not found');
        if (sourceCollection.user.id !== Number(authUser.userId) || destCollection.user.id !== Number(authUser.userId)) {
            throw new NotFoundException('Collection not found');
        }

        const item = sourceCollection.items.find(
            i => i.targetId === targetId && i.targetType === targetType,
        );
        if (!item) throw new NotFoundException('Item not found');

        // Check if item already exists in destination
        const existingInDest = destCollection.items.find(
            i => i.targetId === targetId && i.targetType === targetType,
        );
        if (existingInDest) throw new BadRequestException('Item already exists in destination collection');

        item.collection = destCollection;
        return this.itemRepo.save(item);
    }

    async toggleFavorite(
        authUser: AuthUser,
        collectionId: number,
        targetId: number,
        targetType: CollectionItemEnum,
        value: boolean,
    ) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'items'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const item = collection.items.find(
            i => i.targetId === targetId && i.targetType === targetType,
        );
        if (!item) throw new NotFoundException('Item not found');

        item.isFavorite = value;
        return this.itemRepo.save(item);
    }

    async listItems(
        authUser: AuthUser,
        collectionId: number,
        opts: { page?: number; size?: number; type?: CollectionItemEnum; language?: string; q?: string; sort?: string } = {},
    ) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);

        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        let qb = this.itemRepo.createQueryBuilder('ci').where('ci.collectionId = :collectionId', {
            collectionId,
        });

        if (opts.type) {
            qb = qb.andWhere('ci.targetType = :type', { type: opts.type });
        }

        if (opts.q) {
            // This would require joining with the respective entities and searching their properties
            // For now, a basic implementation
        }

        if (opts.sort) {
            const [field, direction] = opts.sort.split(':');
            if (['isPinned', 'isFavorite', 'createdAt'].includes(field)) {
                qb = qb.orderBy(`ci.${field}`, direction.toUpperCase() as 'ASC' | 'DESC');
            }
        }

        const [items, total] = await qb
            .skip((page - 1) * size)
            .take(size)
            .getManyAndCount();

        return { items, total, page, size };
    }

    async getCollectionByToken(token: string) {
        const collection = await this.collectionRepo.findOne({
            where: { shareToken: token, isPublic: true },
            relations: ['user', 'items'],
        });

        if (!collection) throw new NotFoundException('Collection not found or link has been revoked');

        // Check if link has expired
        if (collection.shareTokenExpiresAt && collection.shareTokenExpiresAt < new Date()) {
            throw new ForbiddenException('This share link has expired');
        }

        const { user: _, ...result } = collection;
        return {
            ...result,
            linkPermission: collection.shareLinkPermission || CollectionPermission.VIEW,
        };
    }

    // Tag Assignment Methods
    async assignTagToCollection(authUser: AuthUser, collectionId: number, tagId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'tags'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const tag = await this.tagRepo.findOne({ where: { id: tagId } });
        if (!tag) throw new NotFoundException('Tag not found');
        if (tag.user.id !== Number(authUser.userId)) throw new BadRequestException('You can only assign your own tags');

        // Check if tag already assigned
        if (collection.tags.some(t => t.id === tagId)) {
            throw new BadRequestException('Tag already assigned to this collection');
        }

        collection.tags.push(tag);
        await this.collectionRepo.save(collection);

        return { message: 'Tag assigned successfully' };
    }

    async removeTagFromCollection(authUser: AuthUser, collectionId: number, tagId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'tags'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        const tagIndex = collection.tags.findIndex(t => t.id === tagId);
        if (tagIndex === -1) throw new NotFoundException('Tag not assigned to this collection');

        collection.tags.splice(tagIndex, 1);
        await this.collectionRepo.save(collection);

        return { message: 'Tag removed successfully' };
    }

    async getCollectionTags(authUser: AuthUser, collectionId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'tags'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new NotFoundException('Collection not found');

        return collection.tags
            .map(({ user, ...tag }) => tag)
            .sort((a, b) => a.order - b.order);
    }

    // Collaboration Methods
    async generateShareLink(authUser: AuthUser, collectionId: number, permission: CollectionPermission, expiresInDays?: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new ForbiddenException('Only collection owner can generate share links');

        // Generate new share token
        collection.shareToken = crypto.randomBytes(32).toString('hex');
        collection.isPublic = true;
        collection.shareLinkPermission = permission;

        // Set expiration if provided
        if (expiresInDays) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            collection.shareTokenExpiresAt = expiresAt;
        } else {
            collection.shareTokenExpiresAt = undefined;
        }

        await this.collectionRepo.save(collection);

        return {
            shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collections/share/${collection.shareToken}`,
            shareToken: collection.shareToken,
            permission: collection.shareLinkPermission,
            expiresAt: collection.shareTokenExpiresAt,
        };
    }

    async revokeShareLink(authUser: AuthUser, collectionId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new ForbiddenException('Only collection owner can revoke share links');

        collection.shareToken = undefined;
        collection.shareTokenExpiresAt = undefined;
        collection.shareLinkPermission = undefined;
        collection.isPublic = false;

        await this.collectionRepo.save(collection);

        return { message: 'Share link revoked successfully' };
    }

    async addCollaborator(authUser: AuthUser, collectionId: number, userId: number, permission: CollectionPermission) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user', 'collaborators'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new ForbiddenException('Only collection owner can add collaborators');

        // Check if user exists
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Check if user is already a collaborator
        const existing = await this.collaboratorRepo.findOne({
            where: { collection: { id: collectionId }, user: { id: userId } },
        });

        if (existing) throw new BadRequestException('User is already a collaborator');

        // Cannot add owner as collaborator
        if (collection.user.id === userId) throw new BadRequestException('Cannot add collection owner as collaborator');

        const collaborator = this.collaboratorRepo.create({
            collection,
            user,
            permission,
            invitedBy: Number(authUser.userId),
        });

        await this.collaboratorRepo.save(collaborator);

        return {
            id: collaborator.id,
            userId: user.id,
            username: user.username,
            permission: collaborator.permission,
            createdAt: collaborator.createdAt,
        };
    }

    async updateCollaboratorPermission(authUser: AuthUser, collectionId: number, collaboratorId: number, permission: CollectionPermission) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new ForbiddenException('Only collection owner can update permissions');

        const collaborator = await this.collaboratorRepo.findOne({
            where: { id: collaboratorId, collection: { id: collectionId } },
            relations: ['user'],
        });

        if (!collaborator) throw new NotFoundException('Collaborator not found');

        collaborator.permission = permission;
        await this.collaboratorRepo.save(collaborator);

        return {
            id: collaborator.id,
            userId: collaborator.user.id,
            username: collaborator.user.username,
            permission: collaborator.permission,
        };
    }

    async removeCollaborator(authUser: AuthUser, collectionId: number, collaboratorId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        if (collection.user.id !== Number(authUser.userId)) throw new ForbiddenException('Only collection owner can remove collaborators');

        const collaborator = await this.collaboratorRepo.findOne({
            where: { id: collaboratorId, collection: { id: collectionId } },
        });

        if (!collaborator) throw new NotFoundException('Collaborator not found');

        await this.collaboratorRepo.remove(collaborator);

        return { message: 'Collaborator removed successfully' };
    }

    async listCollaborators(authUser: AuthUser, collectionId: number) {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) throw new NotFoundException('Collection not found');
        
        // Check if user is owner or collaborator
        const isOwner = collection.user.id === Number(authUser.userId);
        if (!isOwner) {
            const isCollaborator = await this.collaboratorRepo.findOne({
                where: { collection: { id: collectionId }, user: { id: Number(authUser.userId) } },
            });
            if (!isCollaborator) throw new ForbiddenException('Access denied');
        }

        const collaborators = await this.collaboratorRepo.find({
            where: { collection: { id: collectionId } },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });

        return collaborators.map(collab => ({
            id: collab.id,
            userId: collab.user.id,
            username: collab.user.username,
            permission: collab.permission,
            createdAt: collab.createdAt,
        }));
    }

    async checkUserPermission(userId: number, collectionId: number): Promise<CollectionPermission | null> {
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId },
            relations: ['user'],
        });

        if (!collection) return null;

        // Owner has admin permission
        if (collection.user.id === userId) return CollectionPermission.ADMIN;

        // Check collaborator permission
        const collaborator = await this.collaboratorRepo.findOne({
            where: { collection: { id: collectionId }, user: { id: userId } },
        });

        return collaborator ? collaborator.permission : null;
    }
}
