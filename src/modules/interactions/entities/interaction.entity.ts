import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ReactionTypeEnum  }  from '../../../common/enums/reaction-emoji.enum';

@Entity('interactions')
export class Interaction extends BaseEntity {
    @ManyToOne(() => User, user => user.interactions)
    user: User;

    @Column()
    targetId: number;

    @Column()
    targetType: string; // POST | ISSUE | SOLUTION | COMMENT
    
    @Column({ type: 'enum', enum: ReactionTypeEnum })
    type: ReactionTypeEnum;
}
