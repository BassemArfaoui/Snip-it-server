import { Controller, Get, Param, UseGuards, ForbiddenException, ParseIntPipe, Patch, Body, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
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
	async getProfile(
		@Param('id') id: string,
		@CurrentUser() currentUser?: User
	) {
		try {
			const userId = Number(id);
			if (isNaN(userId) || userId <= 0) {
				throw new ForbiddenException('Invalid user ID');
			}
			const currentUserId = currentUser?.id;
			return await this.profileService.getProfile(userId, currentUserId);
		} catch (error) {
			if (error instanceof ForbiddenException || error instanceof NotFoundException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load profile');
		}
	}

	@Get(':id/saved_posts')
	async getSavedPosts(
		@Param('id', ParseIntPipe) id: number,
		@CurrentUser() user: User,
	) {
		try {
			if (!user) {
				throw new ForbiddenException('Authentication required');
			}
			if (user.id !== id) {
				throw new ForbiddenException('You can only view your own saved posts');
			}
			return await this.profileService.getSavedPosts(id, user.id);
		} catch (error) {
			if (error instanceof ForbiddenException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load saved posts');
		}
	}

	@Get(':id/bagdes')
	async getBadges(@Param('id') id: string) {
		const userId = Number(id);
		if (isNaN(userId) || userId <= 0) {
			throw new ForbiddenException('Invalid user ID');
		}
		return this.profileService.getBadges(userId);
	}

	@Get(':id/posts')
	async getUserPosts(@Param('id') id: string, @CurrentUser() currentUser?: User) {
		try {
			const userId = Number(id);
			if (isNaN(userId) || userId <= 0) {
				throw new ForbiddenException('Invalid user ID');
			}
			return await this.profileService.getUserPosts(userId, currentUser);
		} catch (error) {
			if (error instanceof ForbiddenException || error instanceof NotFoundException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load user posts');
		}
	}

	@Get(':id/issues')
	async getUserIssues(@Param('id') id: string, @CurrentUser() currentUser?: User) {
		try {
			const userId = Number(id);
			if (isNaN(userId) || userId <= 0) {
				throw new ForbiddenException('Invalid user ID');
			}
			return await this.profileService.getUserIssues(userId, currentUser);
		} catch (error) {
			if (error instanceof ForbiddenException || error instanceof NotFoundException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load user issues');
		}
	}

	@Get(':id/contrubution_graph')
	async getContributionGraph(@Param('id') id: string) {
		try {
			const userId = Number(id);
			if (isNaN(userId) || userId <= 0) {
				throw new ForbiddenException('Invalid user ID');
			}
			return await this.profileService.getContributionGraph(userId);
		} catch (error) {
			if (error instanceof ForbiddenException || error instanceof NotFoundException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load contribution graph');
		}
	}

	@Get(':id/streak')
	async getStreak(@Param('id') id: string) {
		try {
			const userId = Number(id);
			if (isNaN(userId) || userId <= 0) {
				throw new ForbiddenException('Invalid user ID');
			}
			return await this.profileService.getStreak(userId);
		} catch (error) {
			if (error instanceof ForbiddenException || error instanceof NotFoundException) {
				throw error;
			}
			throw new ForbiddenException('Failed to load streak data');
		}
	}

	@Get(':id/leader_board')
	async getLeaderBoard(@Param('id') id: string) {
		try {
			// Note: id parameter is ignored for global leaderboard
			return await this.profileService.getLeaderBoard(100);
		} catch (error) {
			throw new ForbiddenException('Failed to load leaderboard');
		}
	}

	@Patch()
	async updateProfile(
		@Body() dto: UpdateProfileDto,
		@CurrentUser() user: User,
	) {
		try {
			if (!user) {
				throw new ForbiddenException('Authentication required');
			}
			return await this.profileService.updateProfile(user.id, dto);
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new ForbiddenException('Failed to update profile');
		}
	}

	@Patch('password')
	async updatePassword(
		@Body() dto: UpdatePasswordDto,
		@CurrentUser() user: User,
	) {
		try {
			if (!user) {
				throw new ForbiddenException('Authentication required');
			}
			return await this.profileService.updatePassword(user.id, dto);
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof UnauthorizedException || error instanceof ForbiddenException) {
				throw error;
			}
			throw new ForbiddenException('Failed to update password');
		}
	}
}
