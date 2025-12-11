import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Collection } from './collection.entity';

@Entity('collection_items')
export class CollectionItem extends BaseEntity {
    @ManyToOne(() => Collection, c => c.items)
    collection: Collection;

    @Column()
    targetId: number;

    @Column()
    targetType: string; // POST | ISSUE | SOLUTION | SNIPPET

    @Column({ default: false })
    isPinned: boolean;
}
