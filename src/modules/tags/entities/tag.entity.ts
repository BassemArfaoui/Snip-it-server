import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tags')
export class Tag extends BaseEntity {
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    name: string;

    @Column({ nullable: true })
    color?: string;

    @Column({ default: 0 })
    order: number;
}
