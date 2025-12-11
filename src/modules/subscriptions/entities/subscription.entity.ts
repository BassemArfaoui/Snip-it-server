import { Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
    @ManyToOne(() => User, user => user.subscriptions)
    subscriber: User;

    @ManyToOne(() => User)
    targetUser: User;
}
