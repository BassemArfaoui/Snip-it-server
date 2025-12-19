import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('/comments')
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    // Public: list comments for a post (paginated)
    @Get('posts/:postId')
    async listPostComments(
        @Param('postId', ParseIntPipe) postId: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.commentsService.listPostComments(postId, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    // Auth required: create a comment on a post
    @Post('posts/:postId')
    async createPostComment(
        @Param('postId', ParseIntPipe) postId: number,
        @Req() req: Request & { user?: JwtPayload },
        @Body() dto: CreateCommentDto,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.commentsService.createPostComment(postId, Number(userId), dto);
    }

    // Auth required: update a comment (owner only)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request & { user?: JwtPayload },
        @Body() dto: UpdateCommentDto,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.commentsService.update(id, Number(userId), dto);
    }

    // Auth required: delete a comment (owner only, soft delete)
    @Delete(':id')
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request & { user?: JwtPayload },
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        await this.commentsService.delete(id, Number(userId));
        return { success: true };
    }
}
