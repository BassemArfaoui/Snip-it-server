import { Controller, Get, Req } from '@nestjs/common';

@Controller('/posts')
export class PostsController {
    @Get()
    findAll(@Req() req: any) {
        const user = req['user'];

        return {
            message: 'This is a protected route',
            user,
            posts: [
                { id: 1, title: 'First Post', content: 'This is the first post content' },
                { id: 2, title: 'Second Post', content: 'This is the second post content' },
                { id: 3, title: 'Third Post', content: 'This is the third post content' },
            ],
        };
    }
}
