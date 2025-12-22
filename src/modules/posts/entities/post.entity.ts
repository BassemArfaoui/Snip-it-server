import { Entity, Column, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Snippet } from '../../snippet/entities/snippet.entity';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post extends BaseEntity {
    @OneToOne(() => Snippet, { cascade: true })
    @JoinColumn()
    snippet: Snippet;

    @ManyToOne(() => User, user => user.posts)
    @JoinColumn()
    author: User;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ nullable: true })
    githubLink: string;

    @Column({ nullable: true })
    language: string;

    @Column({ default: 0 })
    viewsCount: number;

    @Column({ default: 0 })
    likesCount: number;

    @Column({ default: 0 })
    commentsCount: number;

    @Column({ default: false })
    isDeleted: boolean;

    @Column({ default: true })
    isDraft: boolean;
}
