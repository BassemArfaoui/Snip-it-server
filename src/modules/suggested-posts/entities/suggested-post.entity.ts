import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('suggested_posts')
@Unique(['user', 'post'])
export class SuggestedPost extends BaseEntity {
    @ManyToOne(() => User, user => user.suggestedPosts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Post, post => post.suggestedFor, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: Post;

    @Column({ type: 'float', nullable: true })
    score?: number;

    @Column({ type: 'varchar', nullable: true })
    reason?: string;

    @Column({ type: 'timestamptz', nullable: true })
    expiresAt?: Date;
}
