import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../src/modules/users/entities/user.entity';
import { Snippet } from '../../src/modules/snippet/entities/snippet.entity';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { Issue } from '../../src/modules/issues/entities/issue.entity';
import { Solution } from '../../src/modules/solutions/entities/solution.entity';
import { Comment } from '../../src/modules/comments/entities/comment.entity';
import { Collection } from '../../src/modules/collections/entities/collection.entity';
import { CollectionItem } from '../../src/modules/collections/entities/item.entity';
import { Subscription } from '../../src/modules/subscriptions/entities/subscription.entity';
import { Interaction } from '../../src/modules/interactions/entities/interaction.entity';
import { PrivateSnippet } from '../../src/modules/private-snippets/entities/private-snippet.entity';
import { SuggestedPost } from '../../src/modules/suggested-posts/entities/suggested-post.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_host,
            port: Number(process.env.DB_port),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD || '',
            database: process.env.POSTGRES_DB,
            autoLoadEntities: true,
            synchronize: true,
        }),
        TypeOrmModule.forFeature([
            User,
            Snippet,
            Post,
            Issue,
            Solution,
            Comment,
            Collection,
            CollectionItem,
            Subscription,
            Interaction,
            PrivateSnippet,
            SuggestedPost,
        ]),
    ],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule { }
