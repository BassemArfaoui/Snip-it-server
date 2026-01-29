import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@Injectable()
export class TagsService {
    constructor(
        @InjectRepository(Tag) private tagRepo: Repository<Tag>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    async createTag(authUser: AuthUser, dto: CreateTagDto) {
        const user = await this.userRepo.findOne({ where: { id: Number(authUser.userId) } });
        if (!user) throw new NotFoundException('User not found');

        // Check if tag with same name already exists for this user
        const existing = await this.tagRepo.findOne({
            where: { user: { id: user.id }, name: dto.name },
        });
        if (existing) throw new BadRequestException(`Tag "${dto.name}" already exists`);

        const tag = this.tagRepo.create({
            user,
            name: dto.name,
            color: dto.color,
            order: dto.order ?? 0,
        });

        const saved = await this.tagRepo.save(tag);
        const { user: _, ...result } = saved;
        return result;
    }

    async getUserTags(authUser: AuthUser, opts: { page?: number; size?: number; q?: string } = {}) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);

        const qb = this.tagRepo.createQueryBuilder('t')
            .where('t.userId = :userId', { userId: authUser.userId });

        if (opts.q) {
            qb.andWhere('t.name ILIKE :q', { q: `%${opts.q}%` });
        }

        const [items, total] = await qb
            .orderBy('t.order', 'ASC')
            .skip((page - 1) * size)
            .take(size)
            .getManyAndCount();

        // Remove user data from all items
        const sanitizedItems = items.map(({ user, ...item }) => item);

        return { items: sanitizedItems, total, page, size };
    }

    async getTagById(authUser: AuthUser, id: number) {
        const tag = await this.tagRepo.findOne({
            where: { id, user: { id: Number(authUser.userId) } },
        });

        if (!tag) throw new NotFoundException('Tag not found');

        const { user, ...result } = tag;
        return result;
    }

    async updateTag(authUser: AuthUser, id: number, dto: UpdateTagDto) {
        const tag = await this.tagRepo.findOne({
            where: { id, user: { id: Number(authUser.userId) } },
        });

        if (!tag) throw new NotFoundException('Tag not found');

        // Check if new name conflicts with existing tag
        if (dto.name !== undefined && dto.name !== tag.name) {
            const existing = await this.tagRepo.findOne({
                where: { user: { id: Number(authUser.userId) }, name: dto.name },
            });
            if (existing) throw new BadRequestException(`Tag "${dto.name}" already exists`);
        }

        if (dto.name !== undefined) tag.name = dto.name;
        if (dto.color !== undefined) tag.color = dto.color;
        if (dto.order !== undefined) tag.order = dto.order;

        const saved = await this.tagRepo.save(tag);
        const { user, ...result } = saved;
        return result;
    }

    async deleteTag(authUser: AuthUser, id: number) {
        const tag = await this.tagRepo.findOne({
            where: { id, user: { id: Number(authUser.userId) } },
        });

        if (!tag) throw new NotFoundException('Tag not found');

        const removed = await this.tagRepo.remove(tag);
        const { user, ...result } = removed;
        return result;
    }
}
