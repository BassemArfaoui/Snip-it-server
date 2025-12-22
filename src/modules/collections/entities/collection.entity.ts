import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CollectionItem } from './item.entity';

@Entity('collections')
export class Collection extends BaseEntity {
    @ManyToOne(() => User, user => user.collections)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    name: string;

    @Column({ default: false })
    isPublic: boolean;

    @Column({ nullable: true })
    shareToken?: string;

    @Column({ default: false })
    allowEdit: boolean;

    @OneToMany(() => CollectionItem, item => item.collection)
    items: CollectionItem[];
}
