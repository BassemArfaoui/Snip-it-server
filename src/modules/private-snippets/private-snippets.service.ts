import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateSnippet } from './entities/private-snippet.entity';
import { Snippet } from '../snippet/entities/snippet.entity';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import { PrivateSnippetVersion } from './entities/private-snippet-version.entity';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@Injectable()
export class PrivateSnippetsService {
    constructor(
        @InjectRepository(PrivateSnippet) private privateSnippetRepo: Repository<PrivateSnippet>,
        @InjectRepository(Snippet) private snippetRepo: Repository<Snippet>,
        @InjectRepository(Post) private postRepo: Repository<Post>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PrivateSnippetVersion) private versionRepo: Repository<PrivateSnippetVersion>,
    ) { }

    async createPrivateSnippet(authUser: AuthUser, title: string | undefined, content: string, language: string) {
        const user = await this.userRepo.findOne({ where: { id: Number(authUser.userId) } });
        if (!user) throw new NotFoundException('User not found');
        
        const snippet = this.snippetRepo.create({ title, content, language });
        await this.snippetRepo.save(snippet);
        const privateSnippet = this.privateSnippetRepo.create({ snippet, user });
        const saved = await this.privateSnippetRepo.save(privateSnippet);
        const { user: _, ...result } = saved;
        return result;
    }

    async updatePrivateSnippet(authUser: AuthUser, id: number, payload: { title?: string; content?: string; language?: string }) {
        const ps = await this.privateSnippetRepo.findOne({ where: { id }, relations: ['snippet', 'user', 'versions'] });
        if (!ps || ps.user.id !== Number(authUser.userId)) throw new NotFoundException('Private snippet not found');

        // Save a version snapshot before updating
        const versionNumber = (ps.versions?.length ?? 0) + 1;
        const version = this.versionRepo.create({
            privateSnippet: ps,
            title: ps.snippet.title,
            content: ps.snippet.content,
            language: ps.snippet.language,
            version: versionNumber,
        });
        await this.versionRepo.save(version);

        if (payload.title !== undefined) ps.snippet.title = payload.title;
        if (payload.content !== undefined) ps.snippet.content = payload.content;
        if (payload.language !== undefined) ps.snippet.language = payload.language;

        await this.snippetRepo.save(ps.snippet);
        return { ...ps, versions: undefined, user: undefined }; // trim versions and user in response
    }

    async getUserPrivateSnippets(authUser: AuthUser, opts: { page?: number; size?: number; q?: string; language?: string } = {}) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);
        
        const qb = this.privateSnippetRepo.createQueryBuilder('ps')
            .leftJoinAndSelect('ps.snippet', 'snippet')
            .where('ps.userId = :userId', { userId: authUser.userId })
            .andWhere('snippet.posted = false');
        
        if (opts.q) {
            qb.andWhere('(snippet.title ILIKE :q OR snippet.content ILIKE :q)', { q: `%${opts.q}%` });
        }
        
        if (opts.language) {
            qb.andWhere('snippet.language = :lang', { lang: opts.language });
        }
        
        const [items, total] = await qb.skip((page - 1) * size).take(size).getManyAndCount();
        // Remove user data from all items
        const sanitizedItems = items.map(({ user, ...item }) => item);
        return { items: sanitizedItems, total, page, size };
    }

    async transformToPost(authUser: AuthUser, privateSnippetId: number, payload: { title: string, description: string, publish?: boolean }) {
        const user = await this.userRepo.findOne({ where: { id: Number(authUser.userId) } });
        if (!user) throw new NotFoundException('User not found');
        
        const ps = await this.privateSnippetRepo.findOne({ where: { id: privateSnippetId }, relations: ['snippet', 'user'] });
        if (!ps || ps.user.id !== Number(authUser.userId)) throw new NotFoundException('Private snippet not found');
        const post = this.postRepo.create({
            title: payload.title,
            description: payload.description,
            snippet: ps.snippet,
            author: user,
            language: ps.snippet.language,
            isDraft: !payload.publish,
        });
        const saved = await this.postRepo.save(post);
        // mark snippet as posted to hide from the personal list
        ps.snippet.posted = true;
        await this.snippetRepo.save(ps.snippet);
        return saved;
    }

    async deletePrivateSnippet(authUser: AuthUser, id: number) {
        const ps = await this.privateSnippetRepo.findOne({ where: { id }, relations: ['user'] });
        if (!ps || ps.user.id !== Number(authUser.userId)) throw new NotFoundException('Private snippet not found');
        const removed = await this.privateSnippetRepo.softRemove(ps);
        const { user: _, ...result } = removed;
        return result;
    }

    async getVersions(authUser: AuthUser, id: number, opts: { page?: number; size?: number } = {}) {
        const page = opts.page ?? 1;
        const size = Math.min(opts.size ?? 20, 100);
        
        const ps = await this.privateSnippetRepo.findOne({ where: { id }, relations: ['user', 'versions'] });
        if (!ps || ps.user.id !== Number(authUser.userId)) throw new NotFoundException('Private snippet not found');
        
        const sorted = ps.versions.sort((a, b) => b.version - a.version);
        const items = sorted.slice((page - 1) * size, page * size);
        const total = sorted.length;
        
        return { items, total, page, size };
    }

    async deleteVersion(authUser: AuthUser, id: number, versionId: number) {
        const ps = await this.privateSnippetRepo.findOne({ where: { id }, relations: ['user', 'versions'] });
        if (!ps || ps.user.id !== Number(authUser.userId)) throw new NotFoundException('Private snippet not found');
        const version = ps.versions.find(v => v.id === versionId);
        if (!version) throw new NotFoundException('Version not found');
        return this.versionRepo.remove(version);
    }
}
