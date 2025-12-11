import { Controller, Get, Param } from '@nestjs/common';
import { SuggestedPostsService } from './suggested_posts.service';

@Controller('suggested-posts')
export class SuggestedPostsController {
    constructor(private readonly service: SuggestedPostsService) { }

    @Get(':userId')
    async getSuggested(@Param('userId') userId: string) {
        const posts = await this.service.getSuggestedPosts(Number(userId));
        return { suggestedPosts: posts };
    }
}
