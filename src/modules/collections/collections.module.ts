import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from './entities/item.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Collection, CollectionItem])],
})
export class CollectionsModule { }
