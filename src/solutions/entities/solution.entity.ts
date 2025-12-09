import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Issue } from '../../issues/entities/issue.entity';
import { User } from '../../users/entities/user.entity';
import { Snippet } from '../../snippet/entities/snippet.entity';

@Entity('solutions')
export class Solution extends BaseEntity {
    @ManyToOne(() => Issue, issue => issue.solutions)
    issue: Issue;

    @ManyToOne(() => User, user => user.solutions)
    contributor: User;

    @Column({ type: 'text', nullable: true })
    textContent: string;

    @OneToOne(() => Snippet, { nullable: true, cascade: true })
    @JoinColumn()
    snippet: Snippet;

    @Column({ nullable: true })
    externalLink: string;

    @Column({ default: 0 })
    likesCount: number;

    @Column({ default: 0 })
    commentsCount: number;

    @Column({ default: false })
    isDeleted: boolean;
}
