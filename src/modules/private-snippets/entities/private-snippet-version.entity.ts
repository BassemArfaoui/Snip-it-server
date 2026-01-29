import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PrivateSnippet } from './private-snippet.entity';

@Entity('private_snippet_versions')
export class PrivateSnippetVersion extends BaseEntity {
    @ManyToOne(() => PrivateSnippet, ps => ps.versions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'privateSnippetId' })
    privateSnippet: PrivateSnippet;

    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'text' })
    content: string;

    @Column()
    language: string;

    @Column({ default: 1 })
    version: number;
}
