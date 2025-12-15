import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CollectionItem } from '../collections/entities/item.entity';
import { CollectionItemEnum } from '../../common/enums/collection-item.enum';

@Injectable()
export class ProfileService {
	constructor(
		@InjectRepository(User) private readonly usersRepo: Repository<User>,
		@InjectRepository(Post) private readonly postsRepo: Repository<Post>,
		@InjectRepository(Issue) private readonly issuesRepo: Repository<Issue>,
		@InjectRepository(Subscription) private readonly subsRepo: Repository<Subscription>,
		@InjectRepository(Collection) private readonly collectionsRepo: Repository<Collection>,
		@InjectRepository(CollectionItem) private readonly itemsRepo: Repository<CollectionItem>,
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
		return null;
	}

	async getStreak(userId: number) {
		return null;
	}

	async getLeaderBoard() {
		const users = await this.usersRepo.find({ order: { contributorScore: 'DESC' } });
		return users.map(u => ({ id: u.id, username: u.username, name: u.fullName, score: u.contributorScore ?? 0 }));
	}
}
