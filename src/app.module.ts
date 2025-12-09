import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { SnippetModule } from './snippet/snippet.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
