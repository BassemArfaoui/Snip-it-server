import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/item.entity';
import { CollectionCollaborator } from './entities/collaborator.entity';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { Post } from '../posts/entities/post.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Solution } from '../solutions/entities/solution.entity';
import { PrivateSnippet } from '../private-snippets/entities/private-snippet.entity';
import { User } from '../users/entities/user.entity';
import { Tag } from '../tags/entities/tag.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Collection, CollectionItem, CollectionCollaborator, Tag, Post, Issue, Solution, PrivateSnippet, User])],
    providers: [CollectionsService],
    controllers: [CollectionsController],
})
export class CollectionsModule { }
