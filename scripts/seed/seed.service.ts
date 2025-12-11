import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { Snippet } from '../../src/modules/snippet/entities/snippet.entity';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { Issue } from '../../src/modules/issues/entities/issue.entity';
import { Solution } from '../../src/modules/solutions/entities/solution.entity';
import { Comment } from '../../src/modules/comments/entities/comment.entity';
import { Collection } from '../../src/modules/collections/entities/collection.entity';
import { CommentTypeEnum } from '../../src/common/enums/comment-type.enum';
import { CollectionItem } from '../../src/modules/collections/entities/item.entity';
import { Subscription } from '../../src/modules/subscriptions/entities/subscription.entity';
import { Interaction } from '../../src/modules/interactions/entities/interaction.entity';

@Injectable()
export class SeedService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Snippet) private snippetRepository: Repository<Snippet>,
        @InjectRepository(Post) private postRepository: Repository<Post>,
        @InjectRepository(Issue) private issueRepository: Repository<Issue>,
        @InjectRepository(Solution) private solutionRepository: Repository<Solution>,
        @InjectRepository(Comment) private commentRepository: Repository<Comment>,
        @InjectRepository(Collection) private collectionRepository: Repository<Collection>,
        @InjectRepository(CollectionItem) private collectionItemRepository: Repository<CollectionItem>,
        @InjectRepository(Subscription) private subscriptionRepository: Repository<Subscription>,
        @InjectRepository(Interaction) private interactionRepository: Repository<Interaction>,
    ) { }

    async seed() {
        console.log('Seeding data...');

        // Create Users
        const user1 = this.userRepository.create({
            email: 'user1@example.com',
            password: 'password123',
            username: 'user1',
            fullName: 'User One',
            role: 'USER',
        });
        await this.userRepository.save(user1);

        const user2 = this.userRepository.create({
            email: 'user2@example.com',
            password: 'password123',
            username: 'user2',
            fullName: 'User Two',
            role: 'CONTRIBUTOR',
            contributorScore: 100,
        });
        await this.userRepository.save(user2);

        // Create Snippet
        const snippet1 = this.snippetRepository.create({
            title: 'Hello World',
            content: 'console.log("Hello World");',
            language: 'javascript',
        });
        await this.snippetRepository.save(snippet1);

        // Create Post
        const post1 = this.postRepository.create({
            title: 'My First Post',
            description: 'This is a description of my first post.',
            author: user2,
            snippet: snippet1,
        });
        await this.postRepository.save(post1);

        // Create Issue
        const issue1 = this.issueRepository.create({
            content: 'I have a bug in my code.',
            language: 'python',
            user: user1,
        });
        await this.issueRepository.save(issue1);

        // Create Solution
        const solution1 = this.solutionRepository.create({
            textContent: 'Here is the fix.',
            issue: issue1,
            contributor: user2,
        });
        await this.solutionRepository.save(solution1);

        // Create Comment
        const comment1 = this.commentRepository.create({
            content: 'Great post!',
            targetId: post1.id,
            targetType: CommentTypeEnum.POST,
            user: user1,
        });
        await this.commentRepository.save(comment1);

        console.log('Seeding completed!');
    }
}
