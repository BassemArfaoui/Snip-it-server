import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('password_resets')
@Index(['user', 'usedAt'])
export class PasswordReset extends BaseEntity {
    @ManyToOne(() => User, { nullable: false, eager: true })
    user: User;

    @Column()
    otpHash: string;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    usedAt?: Date;
}
