import { Entity, Column, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ReactionTypeEnum } from '../../../common/enums/reaction-emoji.enum';
import { InteractionTargetType } from '../../../common/enums/interaction-target-type.enum';

@Entity('interactions')
@Index('UQ_interaction_user_target', ['userId', 'targetType', 'targetId'], { unique: true })
export class Interaction extends BaseEntity {
    @Column()
    userId: number;

    @ManyToOne(() => User, user => user.interactions, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    targetId: number;

    @Column({ type: 'enum', enum: InteractionTargetType })
    targetType: InteractionTargetType;
    
    @Column({ type: 'enum', enum: ReactionTypeEnum })
    type: ReactionTypeEnum;
}
