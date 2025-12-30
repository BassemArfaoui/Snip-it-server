import { Controller, Post, Body, Req, UsePipes, ValidationPipe, Param, Get, Put, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddItemDto } from './dto/add-item.dto';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export interface AuthUser {
    userId: string;
    username: string;
    email: string;
}

@ApiTags('collections')
@ApiBearerAuth('JWT')
@Controller('collections')
export class CollectionsController {
    constructor(private readonly service: CollectionsService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true }))
    create(@Req() req: Request, @Body() dto: CreateCollectionDto) {
        const user = req['user'] as AuthUser;
        return this.service.createCollection(user, dto.name, dto.isPublic ?? false, dto.allowEdit ?? false);
    }

    @Get()
    list(@Req() req: Request, @Query('page') page?: string, @Query('size') size?: string, @Query('q') q?: string, @Query('tags') tags?: string) {
        const user = req['user'] as AuthUser;
        return this.service.getUserCollections(user, {
            page: page ? parseInt(page) : undefined,
            size: size ? parseInt(size) : undefined,
            q,
            tags: tags ? tags.split(',') : undefined,
        });
    }

    @Get(':id')
    get(@Req() req: Request, @Param('id') id: string) {
        const user = req['user'] as AuthUser;
        return this.service.getCollectionById(user, Number(id));
    }

    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateCollectionDto) {
        const user = req['user'] as AuthUser;
        return this.service.updateCollection(user, Number(id), dto as any);
    }

    @Delete(':id')
    delete(@Req() req: Request, @Param('id') id: string) {
        const user = req['user'] as AuthUser;
        return this.service.deleteCollection(user, Number(id));
    }

    @Post(':id/items')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    addItem(@Req() req: Request, @Param('id') id: string, @Body() dto: AddItemDto) {
        const user = req['user'] as AuthUser;
        return this.service.addItemToCollection(user, Number(id), dto.targetId, dto.targetType, dto.isPinned ?? false, dto.isFavorite ?? false);
    }

    @Delete(':id/items')
    removeItem(@Req() req: Request, @Param('id') id: string, @Query('targetId') targetId: string, @Query('targetType') targetType: string) {
        const user = req['user'] as AuthUser;
        return this.service.removeItem(user, Number(id), Number(targetId), targetType as any);
    }

    @Post(':id/items/move')
    moveItem(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: { targetId: number, targetType: string, destinationCollectionId: number }) {
        const user = req['user'] as AuthUser;
        return this.service.moveItem(user, id, body.targetId, body.targetType as any, body.destinationCollectionId);
    }

    @Post(':id/items/favorite')
    toggleFavorite(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() body: { targetId: number, targetType: string, value: boolean }) {
        const user = req['user'] as AuthUser;
        return this.service.toggleFavorite(user, id, body.targetId, body.targetType as any, body.value);
    }

    @Get(':id/items')
    listItems(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Query() query: any) {
        const user = req['user'] as AuthUser;
        const opts = {
            page: query.page ? Number(query.page) : undefined,
            size: query.size ? Number(query.size) : undefined,
            type: query.type as any,
            language: query.language,
            q: query.q,
            sort: query.sort,
        };
        return this.service.listItems(user, id, opts as any);
    }

    @Get('share/token/:token')
    getByToken(@Param('token') token: string) {
        return this.service.getCollectionByToken(token);
    }

    // Tag Assignment Endpoints
    @Post(':id/tags/:tagId')
    assignTag(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('tagId', ParseIntPipe) tagId: number) {
        const user = req['user'] as AuthUser;
        return this.service.assignTagToCollection(user, id, tagId);
    }

    @Delete(':id/tags/:tagId')
    removeTag(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('tagId', ParseIntPipe) tagId: number) {
        const user = req['user'] as AuthUser;
        return this.service.removeTagFromCollection(user, id, tagId);
    }

    @Get(':id/tags')
    getTags(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
        const user = req['user'] as AuthUser;
        return this.service.getCollectionTags(user, id);
    }
}
