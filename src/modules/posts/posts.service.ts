import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Snippet } from '../snippet/entities/snippet.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatedResult, PaginationParams, paginate } from '../../common/utils/pagination';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post) private readonly postRepo: Repository<Post>,
        @InjectRepository(Snippet) private readonly snippetRepo: Repository<Snippet>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) {}

    async findPaginated(params: PaginationParams): Promise<PaginatedResult<Post>> {
        return paginate(this.postRepo, params, {
            relations: ['author', 'snippet'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number): Promise<Post> {
        const post = await this.postRepo.findOne({
            where: { id },
            relations: ['author', 'snippet'],
        });

        if (!post) {
            throw new NotFoundException('Post not found');
        }

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
        const post = await this.postRepo.findOne({ where: { id }, relations: ['author', 'snippet'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (post.author?.id !== requesterId) {
            throw new UnauthorizedException('You cannot edit this post');
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
}
