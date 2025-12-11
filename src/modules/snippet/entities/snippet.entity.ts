import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('snippets')
export class Snippet extends BaseEntity {
    @Column({ nullable: true })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column()
    language: string;

    @Column({ default: false })
    isDeleted: boolean;
}
