import { Entity, Column, ManyToOne } from 'typeorm';
import { CollectionItemEnum } from 'src/common/enums/collection-item.enum';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Collection } from './collection.entity';

@Entity('collection_items')
export class CollectionItem extends BaseEntity {
    @ManyToOne(() => Collection, c => c.items)
    collection: Collection;

    @Column()
    targetId: number;

    @Column({ type: 'enum', enum: CollectionItemEnum })
    targetType: CollectionItemEnum;

    @Column({ default: false })
    isPinned: boolean;
}
