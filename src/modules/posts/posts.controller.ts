import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtPayload } from 'jsonwebtoken';



@Controller('/posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) {}

    @Get()
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.postsService.findPaginated({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.postsService.findOne(id);
    }

    @Post()
    async create(@Req() req: Request & { user?: JwtPayload}, @Body() dto: CreatePostDto) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.postsService.create(Number(userId), dto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request & { user?: JwtPayload},
        @Body() dto: UpdatePostDto,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.postsService.update(id, Number(userId), dto);
    }

    @Delete(':id')
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: Request & { user?: JwtPayload },
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        await this.postsService.delete(id, Number(userId));
        return { success: true };
    }
}
