import { Controller, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SuggestedPostsService } from './suggested-posts.service';
import { JwtPayload } from 'jsonwebtoken';



@Controller('suggested-posts')
export class SuggestedPostsController {
    constructor(private readonly suggestedPostsService: SuggestedPostsService) {}

    @Get('')
    async getForCurrentUser(
        @Req() req: Request & { user?: JwtPayload },
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        const pagination = {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        };

        return this.suggestedPostsService.getSuggestionsForUser(Number(userId), pagination);
    }
}
