import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateSnippet } from './entities/private-snippet.entity';
import { PrivateSnippetsService } from './private-snippets.service';
import { PrivateSnippetsController } from './private-snippets.controller';
import { Snippet } from '../snippet/entities/snippet.entity';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import { PrivateSnippetVersion } from './entities/private-snippet-version.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrivateSnippet, Snippet, Post, User, PrivateSnippetVersion])],
    providers: [PrivateSnippetsService],
    controllers: [PrivateSnippetsController],
})
export class PrivateSnippetsModule { }
