import { Entity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
@Unique(['subscriber', 'targetUser'])
export class Subscription extends BaseEntity {
    @ManyToOne(() => User, user => user.subscriptions, { onDelete: 'CASCADE' })
    subscriber: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    targetUser: User;
}
