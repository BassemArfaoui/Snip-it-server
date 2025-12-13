import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PrivateSnippet } from '../../private-snippets/entities/private-snippet.entity';
import { Post } from '../../posts/entities/post.entity';
import { Issue } from '../../issues/entities/issue.entity';
import { Solution } from '../../solutions/entities/solution.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Interaction } from '../../interactions/entities/interaction.entity';

@Entity('users')
export class User extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({ unique: true })
    username: string;

    @Column()
    fullName: string;

    @Column({ default: false })
    isEmailVerified: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    emailVerifiedAt?: Date;

    @Column({ type: 'varchar', nullable: true, select: false })
    refreshTokenHash?: string | null;

    @Column({ nullable: true })
    role: string;

    @Column({ nullable: true })
    imageProfile: string;

    @Column({ default: 0 })
    contributorScore: number;

    @Column({ default: 0 })
    subscriberCount: number;

    @Column({ default: 0 })
    postsCount: number;

    @Column({ default: 0 })
    solutionsCount: number;

    // RELATIONS
    @OneToMany(() => PrivateSnippet, ps => ps.user)
    privateSnippets: PrivateSnippet[];

    @OneToMany(() => Post, post => post.author)
    posts: Post[];

    @OneToMany(() => Issue, issue => issue.user)
    issues: Issue[];

    @OneToMany(() => Solution, sol => sol.contributor)
    solutions: Solution[];

    @OneToMany(() => Comment, comment => comment.user)
    comments: Comment[];

    @OneToMany(() => Collection, c => c.user)
    collections: Collection[];

    @OneToMany(() => Subscription, s => s.subscriber)
    subscriptions: Subscription[];

    @OneToMany(() => Interaction, i => i.user)
    interactions: Interaction[];
}
