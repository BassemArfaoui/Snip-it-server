import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateSnippet } from './entities/private-snippet.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrivateSnippet])],
})
export class PrivateSnippetsModule { }
