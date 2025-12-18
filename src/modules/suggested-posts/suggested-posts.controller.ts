import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SuggestedPostsService } from './suggested-posts.service';
import { JwtPayload } from 'jsonwebtoken';



@Controller('suggested-posts')
export class SuggestedPostsController {
    constructor(private readonly suggestedPostsService: SuggestedPostsService) {}

    @Get('')
    async getForCurrentUser(@Req() req: Request & { user?:JwtPayload }) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.suggestedPostsService.getSuggestionsForUser(Number(userId));
    }
}
