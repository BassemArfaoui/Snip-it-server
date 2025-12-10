import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { SnippetModule } from './snippet/snippet.module';
import { UsersModule } from './users/users.module';
import { PrivateSnippetsModule } from './private-snippets/private-snippets.module';
import { PostsModule } from './posts/posts.module';
import { IssuesModule } from './issues/issues.module';
import { SolutionsModule } from './solutions/solutions.module';
import { CommentsModule } from './comments/comments.module';
import { CollectionsModule } from './collections/collections.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InteractionsModule } from './interactions/interactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    CommonModule,
    SnippetModule,
    UsersModule,
    PrivateSnippetsModule,
    PostsModule,
    IssuesModule,
    SolutionsModule,
    CommentsModule,
    CollectionsModule,
    SubscriptionsModule,
    InteractionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'auth/(.*)', method: RequestMethod.ALL },
        //message lel team : add any other public routes here
      )
      .forRoutes('*');
  }
}
