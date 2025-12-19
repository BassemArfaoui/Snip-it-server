import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { CommentTypeEnum } from '../../common/enums/comment-type.enum';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PaginatedResult, PaginationParams, paginate } from '../../common/utils/pagination';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    ) {}

    async listPostComments(postId: number, params: PaginationParams): Promise<PaginatedResult<Comment>> {
 
        const post = await this.postRepo.findOne({ where: { id: postId, isDeleted: false } });
        if (!post) throw new NotFoundException('Post not found');

        return paginate(this.commentRepo, params, {
            where: { targetType: CommentTypeEnum.POST, targetId: postId, isDeleted: false },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async createPostComment(postId: number, requesterId: number, dto: CreateCommentDto): Promise<Comment> {
        const post = await this.postRepo.findOne({ where: { id: postId, isDeleted: false } });
        if (!post) throw new NotFoundException('Post not found');

        const user = await this.userRepo.findOne({ where: { id: requesterId } });
        if (!user) throw new UnauthorizedException('User not found');

        const comment = this.commentRepo.create({
            user,
            targetId: postId,
            targetType: CommentTypeEnum.POST,
            content: dto.content,
            isDeleted: false,
        });

        const saved = await this.commentRepo.save(comment);
        const withUser = await this.commentRepo.findOne({ where: { id: saved.id }, relations: ['user'] });
        return withUser ?? saved;
    }

    async update(commentId: number, requesterId: number, dto: UpdateCommentDto): Promise<Comment> {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId, isDeleted: false },
            relations: ['user'],
        });

        if (!comment) throw new NotFoundException('Comment not found');

        if (comment.user?.id !== requesterId) {
            throw new ForbiddenException('You are not the owner');
        }

        if (dto.content !== undefined) comment.content = dto.content;

        return this.commentRepo.save(comment);
    }

    async delete(commentId: number, requesterId: number): Promise<void> {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId, isDeleted: false },
            relations: ['user'],
        });

        if (!comment) throw new NotFoundException('Comment not found');

        if (comment.user?.id !== requesterId) {
            throw new ForbiddenException('You are not the owner');
        }

        await this.commentRepo.update({ id: commentId }, { isDeleted: true });
    }
}
