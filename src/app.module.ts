import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { SnippetModule } from './modules/snippet/snippet.module';
import { UsersModule } from './modules/users/users.module';
import { PrivateSnippetsModule } from './modules/private-snippets/private-snippets.module';
import { PostsModule } from './modules/posts/posts.module';
import { IssuesModule } from './modules/issues/issues.module';
import { SolutionsModule } from './modules/solutions/solutions.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { AuthModule } from './modules/auth/auth.module';
import { DocsModule } from './docs/docs.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SuggestedPostsModule } from './modules/suggested-posts/suggested-posts.module';
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
    AuthModule,
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
    ProfileModule,
    DocsModule,
    SuggestedPostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logging middleware to all routes first
    consumer.apply(LoggerMiddleware).forRoutes('*');

    // Apply auth middleware to all routes except public ones
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '/', method: RequestMethod.GET },
        { path: 'posts/share/*path', method: RequestMethod.GET },
        { path: 'comments/posts/*path', method: RequestMethod.GET },
        { path: 'auth/*path', method: RequestMethod.ALL },
        { path: 'docs/api', method: RequestMethod.ALL },
        { path: 'issues', method: RequestMethod.GET },
        { path: 'issues/:id', method: RequestMethod.GET },
        { path: 'issues/:issueId/solutions', method: RequestMethod.GET },
        // message lel team : add any other public routes here
      )
      .forRoutes('*');
  }
}
