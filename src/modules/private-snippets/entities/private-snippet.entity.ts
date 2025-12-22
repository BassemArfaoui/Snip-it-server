import { Entity, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Snippet } from '../../snippet/entities/snippet.entity';
import { User } from '../../users/entities/user.entity';
import { PrivateSnippetVersion } from './private-snippet-version.entity';

@Entity('private_snippets')
export class PrivateSnippet extends BaseEntity {
    @ManyToOne(() => Snippet)
    @JoinColumn({ name: 'snippetId' })
    snippet: Snippet;

    @ManyToOne(() => User, user => user.privateSnippets)
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => PrivateSnippetVersion, v => v.privateSnippet)
    versions: PrivateSnippetVersion[];
}
