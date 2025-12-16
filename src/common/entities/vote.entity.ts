import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from '../../modules/users/entities/user.entity';
import { VoteTargetType } from '../enums/vote-target.enum';

@Entity('votes')
@Unique(['user', 'targetId', 'targetType'])
@Index(['targetId', 'targetType'])
export class Vote extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Column()
  targetId: number;

  @Column({ type: 'enum', enum: VoteTargetType })
  targetType: VoteTargetType;

  @Column({ default: false })
  isDislike: boolean;
}
