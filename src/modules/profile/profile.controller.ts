import { Controller, Get, Param, UseGuards, ForbiddenException, ParseIntPipe, Patch, Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../issues/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdatePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get(':id')
	async getProfile(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getProfile(userId);
	}

	@Get(':id/saved_posts')
	async getSavedPosts(
		@Param('id', ParseIntPipe) id: number,
		@CurrentUser() user: User,
	) {
		if (user?.id !== id) {
			throw new ForbiddenException('You can only view your own saved posts');
		}

		return this.profileService.getSavedPosts(id, user.id);
	}

	@Get(':id/bagdes')
	async getBadges(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getBadges(userId);
	}

	@Get(':id/posts')
	async getUserPosts(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getUserPosts(userId);
	}

	@Get(':id/issues')
	async getUserIssues(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getUserIssues(userId);
	}

	@Get(':id/contrubution_graph')
	async getContributionGraph(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getContributionGraph(userId);
	}

	@Get(':id/streak')
	async getStreak(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getStreak(userId);
	}

	@Get(':id/leader_board')
	async getLeaderBoard(@Param('id') id: string) {
		// Note: id parameter is ignored for global leaderboard
		return this.profileService.getLeaderBoard(100);
	}

	@Patch()
	async updateProfile(
		@Body() dto: UpdateProfileDto,
		@CurrentUser() user: User,
	) {
		return this.profileService.updateProfile(user.id, dto);
	}

	@Patch('password')
	async updatePassword(
		@Body() dto: UpdatePasswordDto,
		@CurrentUser() user: User,
	) {
		return this.profileService.updatePassword(user.id, dto);
	}
}
