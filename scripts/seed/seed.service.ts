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
import { PrivateSnippet } from '../../src/modules/private-snippets/entities/private-snippet.entity';
import { CollectionItemEnum } from '../../src/common/enums/collection-item.enum';
import * as bcrypt from 'bcrypt';
import { SuggestedPost } from '../../src/modules/suggested-posts/entities/suggested-post.entity';

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
        @InjectRepository(SuggestedPost) private suggestedPostRepository: Repository<SuggestedPost>,
        @InjectRepository(PrivateSnippet) private privateSnippetRepository: Repository<PrivateSnippet>,
    ) { }

    async seed() {
        console.log('Seeding data...');

        const existingUsers = await this.userRepository.count();
        if (existingUsers > 0) {
            console.log('Database already has users; skipping seed to avoid duplicates.');
            return;
        }

        // Create Users
        const user1 = this.userRepository.create({
            email: 'user1@example.com',
            password: await bcrypt.hash('password123', 10),
            username: 'user1',
            fullName: 'User One',
            role: 'USER',
        });
        await this.userRepository.save(user1);

        const user2 = this.userRepository.create({
            email: 'user2@example.com',
            password: await bcrypt.hash('password123', 10),
            username: 'user2',
            fullName: 'User Two',
            role: 'CONTRIBUTOR',
            contributorScore: 100,
        });
        await this.userRepository.save(user2);

        const user3 = this.userRepository.create({
            email: 'user3@example.com',
            password: await bcrypt.hash('password123', 10),
            username: 'user3',
            fullName: 'User Three',
            role: 'CONTRIBUTOR',
            contributorScore: 45,
        });
        await this.userRepository.save(user3);

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
            language: snippet1.language,
        });
        await this.postRepository.save(post1);

        const snippet2 = this.snippetRepository.create({
            title: 'Sum Function',
            content: 'function sum(a,b){return a+b;}',
            language: 'javascript',
        });
        await this.snippetRepository.save(snippet2);

        const post2 = this.postRepository.create({
            title: 'Second Post',
            description: 'Another post by user2',
            author: user2,
            snippet: snippet2,
            language: snippet2.language,
        });
        await this.postRepository.save(post2);

        // Create Issue
        const issue1 = this.issueRepository.create({
            content: 'I have a bug in my code.',
            language: 'python',
            user: user1,
        });
        await this.issueRepository.save(issue1);

        const issue2 = this.issueRepository.create({
            content: 'Styles not loading in production',
            language: 'css',
            user: user1,
        });
        await this.issueRepository.save(issue2);

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

        // Subscriptions (followers/following)
        const sub1 = this.subscriptionRepository.create({ subscriber: user1, targetUser: user2 });
        await this.subscriptionRepository.save(sub1);
        const sub2 = this.subscriptionRepository.create({ subscriber: user3, targetUser: user2 });
        await this.subscriptionRepository.save(sub2);

        // Collections and saved posts for user1
        const saved = this.collectionRepository.create({ user: user1, name: 'Saved' });
        await this.collectionRepository.save(saved);
        const savedItem1 = this.collectionItemRepository.create({
            collection: saved,
            targetId: post1.id,
            targetType: CollectionItemEnum.POST,
            isPinned: false,
            isFavorite: true,
        });
        await this.collectionItemRepository.save(savedItem1);

        // Example of a shareable collection for user2 (read-only link by default)
        const shared = this.collectionRepository.create({ user: user2, name: 'Shared With Friends', isPublic: false, shareToken: 'share_abc123', allowEdit: false });
        await this.collectionRepository.save(shared);

        // Create private snippets for user1
        const privateSnippet1Snippet = this.snippetRepository.create({
            title: 'React useDebounce Hook',
            content: 'export const useDebounce = (value, delay) => { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]); return debouncedValue; };',
            language: 'typescript',
        });
        await this.snippetRepository.save(privateSnippet1Snippet);
        const privateSnippet1 = this.privateSnippetRepository.create({ snippet: privateSnippet1Snippet, user: user1 });
        await this.privateSnippetRepository.save(privateSnippet1);

        const privateSnippet2Snippet = this.snippetRepository.create({
            title: 'Python Quick Sort',
            content: 'def quicksort(arr): if len(arr) <= 1: return arr; pivot = arr[len(arr) // 2]; left = [x for x in arr if x < pivot]; middle = [x for x in arr if x == pivot]; right = [x for x in arr if x > pivot]; return quicksort(left) + middle + quicksort(right);',
            language: 'python',
        });
        await this.snippetRepository.save(privateSnippet2Snippet);
        const privateSnippet2 = this.privateSnippetRepository.create({ snippet: privateSnippet2Snippet, user: user1 });
        await this.privateSnippetRepository.save(privateSnippet2);

        console.log('Seeding completed!');
    }

    async seedSuggestedPosts() {
        console.log('Seeding suggested posts...');

        const users = await this.userRepository.find({ take: 5 });
        const posts = await this.postRepository.find({ take: 10 });

        if (!users.length || !posts.length) {
            console.log('No users or posts available; skipping suggested posts seed.');
            return;
        }

        const suggestions: SuggestedPost[] = [];

        users.forEach((user, idx) => {
            // Suggest two posts per user for demo purposes
            const first = posts[idx % posts.length];
            const second = posts[(idx + 1) % posts.length];

            [first, second].forEach((post, order) => {
                const suggestion = this.suggestedPostRepository.create({
                    user,
                    post,
                    score: 0.8 - order * 0.1,
                    reason: 'seeded-demo',
                });
                suggestions.push(suggestion);
            });
        });

        await this.suggestedPostRepository.save(suggestions);
        console.log(`Seeded ${suggestions.length} suggested posts.`);
    }
}
