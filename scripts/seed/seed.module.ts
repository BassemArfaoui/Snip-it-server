import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../src/users/entities/user.entity';
import { Snippet } from '../../src/snippet/entities/snippet.entity';
import { Post } from '../../src/posts/entities/post.entity';
import { Issue } from '../../src/issues/entities/issue.entity';
import { Solution } from '../../src/solutions/entities/solution.entity';
import { Comment } from '../../src/comments/entities/comment.entity';
import { Collection } from '../../src/collections/entities/collection.entity';
import { CollectionItem } from '../../src/collections/entities/item.entity';
import { Subscription } from '../../src/subscriptions/entities/subscription.entity';
import { Interaction } from '../../src/interactions/entities/interaction.entity';
import { PrivateSnippet } from '../../src/private-snippets/entities/private-snippet.entity';
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
        ]),
    ],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule { }
