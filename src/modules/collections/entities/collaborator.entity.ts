import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Collection } from './collection.entity';
import { User } from '../../users/entities/user.entity';
import { CollectionPermission } from '../../../common/enums/collection-permission.enum';

@Entity('collection_collaborators')
@Unique(['collection', 'user'])
export class CollectionCollaborator extends BaseEntity {
    @ManyToOne(() => Collection, collection => collection.collaborators)
    @JoinColumn({ name: 'collectionId' })
    collection: Collection;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({
        type: 'enum',
        enum: CollectionPermission,
        default: CollectionPermission.VIEW
    })
    permission: CollectionPermission;

    @Column({ nullable: true })
    invitedBy: number;
}
