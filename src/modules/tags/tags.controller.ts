import { Controller, Post, Body, Req, UsePipes, ValidationPipe, Get, Param, Put, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@ApiTags('tags')
@ApiBearerAuth('JWT')
@Controller('tags')
export class TagsController {
    constructor(private readonly service: TagsService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Req() req: Request, @Body() dto: CreateTagDto) {
        const user = req['user'] as AuthUser;
        return this.service.createTag(user, dto);
    }

    @Get()
    list(@Req() req: Request, @Query('page') page?: string, @Query('size') size?: string, @Query('q') q?: string) {
        const user = req['user'] as AuthUser;
        return this.service.getUserTags(user, {
            page: page ? parseInt(page) : undefined,
            size: size ? parseInt(size) : undefined,
            q,
        });
    }

    @Get(':id')
    get(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
        const user = req['user'] as AuthUser;
        return this.service.getTagById(user, id);
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
        const user = req['user'] as AuthUser;
        return this.service.updateTag(user, id, dto);
    }

    @Delete(':id')
    delete(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
        const user = req['user'] as AuthUser;
        return this.service.deleteTag(user, id);
    }
}
