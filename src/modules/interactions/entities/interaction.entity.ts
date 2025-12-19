import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ReactionTypeEnum } from '../../../common/enums/reaction-emoji.enum';
import { InteractionTargetType } from '../../../common/enums/interaction-target-type.enum';

@Entity('interactions')
export class Interaction extends BaseEntity {
    @ManyToOne(() => User, user => user.interactions)
    user: User;

    @Column()
    targetId: number;

    @Column({ type: 'enum', enum: InteractionTargetType })
    targetType: InteractionTargetType;
    
    @Column({ type: 'enum', enum: ReactionTypeEnum })
    type: ReactionTypeEnum;
}
