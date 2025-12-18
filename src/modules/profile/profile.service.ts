import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CollectionItem } from '../collections/entities/item.entity';
import { CollectionItemEnum } from '../../common/enums/collection-item.enum';
import { Solution } from '../solutions/entities/solution.entity';
import { Comment } from '../comments/entities/comment.entity';
import { HashingService } from '../../common/services/hashing.service';
import { UpdatePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
	constructor(
		@InjectRepository(User) private readonly usersRepo: Repository<User>,
		@InjectRepository(Post) private readonly postsRepo: Repository<Post>,
		@InjectRepository(Issue) private readonly issuesRepo: Repository<Issue>,
		@InjectRepository(Subscription) private readonly subsRepo: Repository<Subscription>,
		@InjectRepository(Collection) private readonly collectionsRepo: Repository<Collection>,
		@InjectRepository(CollectionItem) private readonly itemsRepo: Repository<CollectionItem>,
		@InjectRepository(Solution) private readonly solutionsRepo: Repository<Solution>,
		@InjectRepository(Comment) private readonly commentsRepo: Repository<Comment>,
		private readonly hashingService: HashingService,
	) {}

	async getProfile(userId: number) {
		const user = await this.usersRepo.findOne({ where: { id: userId } });
		if (!user) return null;

		const [followers, following, postsCount, issuesCount] = await Promise.all([
			this.subsRepo.count({ where: { targetUser: { id: userId } } }),
			this.subsRepo.count({ where: { subscriber: { id: userId } } }),
			this.postsRepo.count({ where: { author: { id: userId } } }),
			this.issuesRepo.count({ where: { user: { id: userId } } }),
		]);

		return {
			id: user.id,
			name: user.fullName,
			username: user.username,
			followers,
			followedBy: following,
			posts: postsCount,
			issues: issuesCount,
			score: user.contributorScore ?? 0,
		};
	}

	async getSavedPosts(userId: number, currentUserId: number) {
		if (userId !== currentUserId) return [];

		const collections = await this.collectionsRepo.find({
			where: { user: { id: userId } },
			relations: ['items'],
		});

		const postIds = collections
			.flatMap(c => c.items || [])
			.filter(i => i.targetType === CollectionItemEnum.POST)
			.map(i => i.targetId);

		if (postIds.length === 0) return [];

		const posts = await this.postsRepo.find({
			where: { id: In(postIds) },
			relations: ['author', 'snippet'],
		});
		return posts;
	}

	async getBadges(userId: number) {
		// No badges entity yet; return empty for now
		return [] as any[];
	}

	async getUserPosts(userId: number) {
		return this.postsRepo.find({ where: { author: { id: userId } }, relations: ['author', 'snippet'] });
	}

	async getUserIssues(userId: number) {
		return this.issuesRepo.find({ where: { user: { id: userId } } });
	}

	async getContributionGraph(userId: number) {
		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		// Fetch all contributions from the past year
		const [posts, issues, solutions, comments] = await Promise.all([
			this.postsRepo
				.createQueryBuilder('post')
				.select("DATE(post.\"createdAt\")", 'date')
				.addSelect('COUNT(*)::int', 'count')
				.leftJoin('post.author', 'author')
				.where('author.id = :userId', { userId })
				.andWhere('post.createdAt >= :oneYearAgo', { oneYearAgo })
				.groupBy('DATE(post.\"createdAt\")')
				.getRawMany(),
			this.issuesRepo
				.createQueryBuilder('issue')
				.select("DATE(issue.\"createdAt\")", 'date')
				.addSelect('COUNT(*)::int', 'count')
				.leftJoin('issue.user', 'user')
				.where('user.id = :userId', { userId })
				.andWhere('issue.createdAt >= :oneYearAgo', { oneYearAgo })
				.groupBy('DATE(issue.\"createdAt\")')
				.getRawMany(),
			this.solutionsRepo
				.createQueryBuilder('solution')
				.select("DATE(solution.\"createdAt\")", 'date')
				.addSelect('COUNT(*)::int', 'count')
				.leftJoin('solution.contributor', 'contributor')
				.where('contributor.id = :userId', { userId })
				.andWhere('solution.createdAt >= :oneYearAgo', { oneYearAgo })
				.groupBy('DATE(solution.\"createdAt\")')
				.getRawMany(),
			this.commentsRepo
				.createQueryBuilder('comment')
				.select("DATE(comment.\"createdAt\")", 'date')
				.addSelect('COUNT(*)::int', 'count')
				.leftJoin('comment.user', 'user')
				.where('user.id = :userId', { userId })
				.andWhere('comment.createdAt >= :oneYearAgo', { oneYearAgo })
				.groupBy('DATE(comment.\"createdAt\")')
				.getRawMany(),
		]);

		// Aggregate counts by date
		const contributionMap = new Map<string, number>();

		const addToMap = (entries: Array<{ date: any; count: any }>) => {
			for (const entry of entries) {
				// PostgreSQL ::date returns date string like '2024-12-18' or Date object
				let dateStr: string;
				if (entry.date instanceof Date) {
					dateStr = entry.date.toISOString().split('T')[0];
				} else {
					dateStr = String(entry.date).split('T')[0];
				}
				const count = parseInt(String(entry.count), 10);
				contributionMap.set(dateStr, (contributionMap.get(dateStr) || 0) + count);
			}
		};

		addToMap(posts);
		addToMap(issues);
		addToMap(solutions);
		addToMap(comments);

		// Generate array of {date, count} for all days in the past year
		const result: Array<{ date: string; count: number }> = [];
		const today = new Date();
		for (let i = 365; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];
			result.push({
				date: dateStr,
				count: contributionMap.get(dateStr) || 0,
			});
		}

		return result;
	}

	async getStreak(userId: number) {
		// Get contribution graph data (reuses existing logic)
		const contributionData = await this.getContributionGraph(userId);
		
		// Extract dates with activity (count > 0)
		const activeDates = contributionData
			.filter(day => day.count > 0)
			.map(day => day.date)
			.sort();

		if (activeDates.length === 0) {
			return { currentStreak: 0, longestStreak: 0, totalContributions: 0 };
		}

		// Calculate current streak (from today or yesterday backwards)
		const today = new Date();
		const todayStr = today.toISOString().split('T')[0];
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toISOString().split('T')[0];

		let currentStreak = 0;
		const activeDatesSet = new Set(activeDates);

		// Start from today if there's activity, otherwise yesterday
		let checkDate = activeDatesSet.has(todayStr) ? new Date(today) : new Date(yesterday);
		let checkDateStr = checkDate.toISOString().split('T')[0];

		// Count consecutive days backwards
		while (activeDatesSet.has(checkDateStr)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
			checkDateStr = checkDate.toISOString().split('T')[0];
		}

		// Calculate longest streak
		let longestStreak = 1;
		let tempStreak = 1;

		for (let i = 1; i < activeDates.length; i++) {
			const prevDate = new Date(activeDates[i - 1]);
			const currDate = new Date(activeDates[i]);
			const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

			if (dayDiff === 1) {
				tempStreak++;
			} else {
				longestStreak = Math.max(longestStreak, tempStreak);
				tempStreak = 1;
			}
		}
		longestStreak = Math.max(longestStreak, tempStreak);

		const totalContributions = contributionData.reduce((sum, day) => sum + day.count, 0);

		return {
			currentStreak,
			longestStreak,
			lastContributionDate: activeDates[activeDates.length - 1],
			totalContributions,
		};
	}

	async getLeaderBoard(limit: number = 100) {
		const users = await this.usersRepo.find({ 
			order: { contributorScore: 'DESC' },
			take: limit,
		});

		return users.map((u, index) => ({
			rank: index + 1,
			id: u.id,
			username: u.username,
			name: u.fullName,
			score: u.contributorScore ?? 0,
			postsCount: u.postsCount ?? 0,
			followers: u.subscriberCount ?? 0,
			imageProfile: u.imageProfile,
		}));
	}

	// Simple score: 3*posts + 2*issues (no followers)
	async calculateAndPersistScore(userId: number) {
		const [postsCount, issuesCount] = await Promise.all([
			this.postsRepo.count({ where: { author: { id: userId } } }),
			this.issuesRepo.count({ where: { user: { id: userId } } }),
		]);

		const score = 3 * postsCount + 2 * issuesCount;
		await this.usersRepo.update({ id: userId }, { contributorScore: score });
		return score;
	}

	async updateProfile(userId: number, dto: UpdateProfileDto) {
		const user = await this.usersRepo.findOne({ where: { id: userId } });
		if (!user) {
			throw new BadRequestException('User not found');
		}

		if (dto.username) {
			const existingUsername = await this.usersRepo.findOne({ where: { username: dto.username } });
			if (existingUsername && existingUsername.id !== userId) {
				throw new ConflictException('Username already taken');
			}
			user.username = dto.username;
		}

		if (dto.email) {
			const existingEmail = await this.usersRepo.findOne({ where: { email: dto.email } });
			if (existingEmail && existingEmail.id !== userId) {
				throw new ConflictException('Email already taken');
			}
			user.email = dto.email;
			user.isEmailVerified = false;
		}

		if (dto.imageProfile !== undefined) {
			user.imageProfile = dto.imageProfile;
		}

		await this.usersRepo.save(user);

		return {
			id: user.id,
			username: user.username,
			email: user.email,
			imageProfile: user.imageProfile,
			message: dto.email ? 'Profile updated. Please verify your new email address.' : 'Profile updated successfully',
		};
	}

	async updatePassword(userId: number, dto: UpdatePasswordDto) {
		const user = await this.usersRepo.findOne({ where: { id: userId } });
		if (!user) {
			throw new BadRequestException('User not found');
		}

		const isCurrentPasswordValid = await this.hashingService.compare(dto.currentPassword, user.password);
		if (!isCurrentPasswordValid) {
			throw new UnauthorizedException('Current password is incorrect');
		}

		if (dto.currentPassword === dto.newPassword) {
			throw new BadRequestException('New password must be different from current password');
		}

		const hashedPassword = await this.hashingService.hash(dto.newPassword);
		user.password = hashedPassword;
		user.refreshTokenHash = null;

		await this.usersRepo.save(user);

		return { message: 'Password updated successfully. Please login again with your new password.' };
	}
}
