import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CommentTypeEnum } from '../../../common/enums/comment-type.enum';

@Entity('comments')
export class Comment extends BaseEntity {
    @ManyToOne(() => User, user => user.comments)
    user: User;

    @Column()
    targetId: number;

    @Column({ type: 'enum', enum: CommentTypeEnum })
    targetType: CommentTypeEnum;

    @ManyToOne(() => Comment, { nullable: true })
    parentComment: Comment;

    @Column({ type: 'text' })
    content: string;

    @Column({ default: false })
    isDeleted: boolean;
}
