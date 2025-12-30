import { Controller, Post, Body, Req, UsePipes, ValidationPipe, Get, Param, Delete, ParseIntPipe, Put, Query } from '@nestjs/common';
import { PrivateSnippetsService } from './private-snippets.service';
import { CreatePrivateSnippetDto } from './dto/create-private-snippet.dto';
import { UpdatePrivateSnippetDto } from './dto/update-private-snippet.dto';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@ApiTags('private-snippets')
@ApiBearerAuth('JWT')
@Controller('private-snippets')
export class PrivateSnippetsController {
    constructor(private readonly service: PrivateSnippetsService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Req() req: Request, @Body() dto: CreatePrivateSnippetDto) {
        const user = req['user'] as AuthUser;
        return this.service.createPrivateSnippet(user, dto.title, dto.content, dto.language);
    }

    @Get()
    list(@Req() req: Request, @Query('page') page?: string, @Query('size') size?: string, @Query('q') q?: string, @Query('language') language?: string) {
        const user = req['user'] as AuthUser;
        return this.service.getUserPrivateSnippets(user, {
            page: page ? parseInt(page) : undefined,
            size: size ? parseInt(size) : undefined,
            q,
            language,
        });
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrivateSnippetDto) {
        const user = req['user'] as AuthUser;
        return this.service.updatePrivateSnippet(user, id, dto);
    }

    @Post(':id/transform')
    transform(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: { title: string, description: string, publish?: boolean }) {
        const user = req['user'] as AuthUser;
        return this.service.transformToPost(user, id, body);
    }

    @Delete(':id')
    delete(@Req() req: Request, @Param('id') id: string) {
        const user = req['user'] as AuthUser;
        return this.service.deletePrivateSnippet(user, Number(id));
    }

    @Get(':id/versions')
    getVersions(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Query('page') page?: string, @Query('size') size?: string) {
        const user = req['user'] as AuthUser;
        return this.service.getVersions(user, id, {
            page: page ? parseInt(page) : undefined,
            size: size ? parseInt(size) : undefined,
        });
    }

    @Delete(':id/versions/:versionId')
    deleteVersion(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('versionId', ParseIntPipe) versionId: number) {
        const user = req['user'] as AuthUser;
        return this.service.deleteVersion(user, id, versionId);
    }
}