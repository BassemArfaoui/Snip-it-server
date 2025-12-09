import { Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Snippet } from '../../snippet/entities/snippet.entity';
import { User } from '../../users/entities/user.entity';

@Entity('private_snippets')
export class PrivateSnippet extends BaseEntity {
    @ManyToOne(() => Snippet)
    @JoinColumn()
    snippet: Snippet;

    @ManyToOne(() => User, user => user.privateSnippets)
    user: User;
}
