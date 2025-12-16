import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Solution } from '../../solutions/entities/solution.entity';

@Entity('issues')
export class Issue extends BaseEntity {
    @ManyToOne(() => User, user => user.issues)
    user: User;

    @Column({ type: 'text' })
    content: string;

    @Column()
    language: string;

    @Column({ default: 0 })
    solutionsCount: number;

    @Column({ default: 0 })
    likesCount: number;

    @Column({ default: 0 })
    dislikesCount: number;

    @Column({ default: false })
    isResolved: boolean;

    @Column({ default: false })
    isDeleted: boolean;

    @OneToMany(() => Solution, solution => solution.issue)
    solutions: Solution[];
}
