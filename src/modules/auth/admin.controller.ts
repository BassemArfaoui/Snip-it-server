import { Body, Controller, Delete, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';
import { SolutionsService } from '../solutions/solutions.service';
import { IssuesService } from '../issues/issues.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('auth/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(
        private readonly usersService: UsersService,
        private readonly postsService: PostsService,
        private readonly commentsService: CommentsService,
        private readonly solutionsService: SolutionsService,
        private readonly issuesService: IssuesService,
    ) { }

    @Get('users')
    @Roles(Role.Admin)
    async listUsers() {
        const users = await this.usersService.findAll();
        return users.map(u => ({
            id: u.id,
            email: u.email,
            username: u.username,
            fullName: u.fullName,
            isEmailVerified: u.isEmailVerified,
            role: u.role,
            imageProfile: u.imageProfile,
            contributorScore: u.contributorScore,
            subscriberCount: u.subscriberCount,
            followingCount: u.followingCount,
            postsCount: u.postsCount,
            solutionsCount: u.solutionsCount,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        }));
    }

    @Post('users/:id/promote')
    @Roles(Role.Admin)
    async promote(@Param('id') id: string, @Req() req: Request) {
        const requesterId = (req.user as any)?.userId;
        const userId = Number(id);
        const user = await this.usersService.findById(userId);
        if (!user) return { message: 'User not found' };
        if (requesterId === userId) return { message: 'Cannot promote yourself' };
        user.role = Role.Admin;
        await this.usersService.save(user);
        return { message: 'User promoted to admin' };
    }

    @Post('users/:id/demote')
    @Roles(Role.Admin)
    async demote(@Param('id') id: string, @Req() req: Request) {
        const requesterId = (req.user as any)?.userId;
        const userId = Number(id);
        if (requesterId === userId) return { message: 'Cannot demote yourself' };
        const user = await this.usersService.findById(userId);
        if (!user) return { message: 'User not found' };
        user.role = Role.User;
        await this.usersService.save(user);
        return { message: 'User demoted to user' };
    }

    @Delete('users/:id')
    @Roles(Role.Admin)
    async deleteUser(@Param('id') id: string, @Req() req: Request) {
        const requesterId = (req.user as any)?.userId;
        const userId = Number(id);
        if (requesterId === userId) return { message: 'Cannot delete yourself' };
        const user = await this.usersService.findById(userId);
        if (!user) return { message: 'User not found' };
        await this.usersService.removeById(userId);
        return { message: 'User deleted' };
    }

    @Post('users/:id/ban')
    @Roles(Role.Admin)
    async banUser(@Param('id') id: string, @Req() req: Request) {
        const requesterId = (req.user as any)?.userId;
        const userId = Number(id);
        if (requesterId === userId) return { message: 'Cannot ban yourself' };
        const user = await this.usersService.findById(userId);
        if (!user) return { message: 'User not found' };
        await this.usersService.banUser(userId);
        return { message: 'User banned' };
    }

    @Post('users/:id/unban')
    @Roles(Role.Admin)
    async unbanUser(@Param('id') id: string) {
        const userId = Number(id);
        const user = await this.usersService.findById(userId);
        if (!user) return { message: 'User not found' };
        await this.usersService.unbanUser(userId);
        return { message: 'User unbanned' };
    }

    // Posts
    @Post('posts/:id/delete')
    @Roles(Role.Admin)
    async adminDeletePost(@Param('id') id: string) {
        const postId = Number(id);
        await this.postsService.adminDelete(postId);
        return { message: 'Post deleted' };
    }

    @Post('posts/:id/restore')
    @Roles(Role.Admin)
    async adminRestorePost(@Param('id') id: string) {
        const postId = Number(id);
        await this.postsService.adminRestore(postId);
        return { message: 'Post restored' };
    }

    // Comments
    @Post('comments/:id/delete')
    @Roles(Role.Admin)
    async adminDeleteComment(@Param('id') id: string) {
        const commentId = Number(id);
        await this.commentsService.adminDelete(commentId);
        return { message: 'Comment deleted' };
    }

    @Post('comments/:id/restore')
    @Roles(Role.Admin)
    async adminRestoreComment(@Param('id') id: string) {
        const commentId = Number(id);
        await this.commentsService.adminRestore(commentId);
        return { message: 'Comment restored' };
    }

    // Solutions
    @Post('solutions/:id/delete')
    @Roles(Role.Admin)
    async adminDeleteSolution(@Param('id') id: string) {
        const solutionId = Number(id);
        await this.solutionsService.adminDelete(solutionId);
        return { message: 'Solution deleted' };
    }

    // Issues
    @Post('issues/:id/delete')
    @Roles(Role.Admin)
    async adminDeleteIssue(@Param('id') id: string) {
        const issueId = Number(id);
        await this.issuesService.adminDelete(issueId);
        return { message: 'Issue deleted' };
    }

    @Post('issues/:id/restore')
    @Roles(Role.Admin)
    async adminRestoreIssue(@Param('id') id: string) {
        const issueId = Number(id);
        await this.issuesService.adminRestore(issueId);
        return { message: 'Issue restored' };
    }
}
