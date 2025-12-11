import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snippet } from './entities/snippet.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Snippet])],
})
export class SnippetModule { }
