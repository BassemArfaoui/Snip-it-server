import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment extends BaseEntity {
    @ManyToOne(() => User, user => user.comments)
    user: User;

    @Column()
    targetId: number;

    @Column()
    targetType: string; // POST | ISSUE | SOLUTION

    @ManyToOne(() => Comment, { nullable: true })
    parentComment: Comment;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: false })
    isDeleted: boolean;
}
