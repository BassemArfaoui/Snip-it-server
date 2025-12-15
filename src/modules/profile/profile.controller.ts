import { Controller, Get, Param, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get(':id')
	async getProfile(@Param('id') id: string) {
		const userId = Number(id);
		return this.profileService.getProfile(userId);
	}

	@Get(':id/saved_posts')
	async getSavedPosts(@Param('id') id: string, @Req() req: any) {
		const userId = Number(id);
		const currentUserId = req['user']?.userId as number;
		return this.profileService.getSavedPosts(userId, currentUserId);
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
	async getLeaderBoard() {
		return this.profileService.getLeaderBoard();
	}
}
