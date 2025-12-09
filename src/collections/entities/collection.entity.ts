import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CollectionItem } from './item.entity';

@Entity('collections')
export class Collection extends BaseEntity {
    @ManyToOne(() => User, user => user.collections)
    user: User;

    @Column()
    name: string;

    @OneToMany(() => CollectionItem, item => item.collection)
    items: CollectionItem[];
}
