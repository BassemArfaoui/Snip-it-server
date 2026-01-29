import { Entity, Column, ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CollectionItem } from './item.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { CollectionCollaborator } from './collaborator.entity';

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

    @Column({ type: 'timestamp', nullable: true })
    shareTokenExpiresAt?: Date;

    @Column({ 
        type: 'enum', 
        enum: ['view', 'edit', 'admin'],
        nullable: true 
    })
    shareLinkPermission?: string;

    @OneToMany(() => CollectionItem, item => item.collection)
    items: CollectionItem[];

    @OneToMany(() => CollectionCollaborator, collaborator => collaborator.collection)
    collaborators: CollectionCollaborator[];

    @ManyToMany(() => Tag)
    @JoinTable({
        name: 'collection_tags',
        joinColumn: { name: 'collectionId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
    })
    tags: Tag[];
}
