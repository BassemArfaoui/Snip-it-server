import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CollectionItemEnum } from '../../../common/enums/collection-item.enum';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Collection } from './collection.entity';

@Entity('collection_items')
export class CollectionItem extends BaseEntity {
    @ManyToOne(() => Collection, c => c.items)
    @JoinColumn({ name: 'collectionId' })
    collection: Collection;

    @Column()
    targetId: number;

    @Column({ type: 'enum', enum: CollectionItemEnum })
    targetType: CollectionItemEnum;

    @Column({ default: false })
    isPinned: boolean;

    @Column({ default: false })
    isFavorite: boolean;
}
