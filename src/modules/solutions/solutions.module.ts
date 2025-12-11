import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Solution } from './entities/solution.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Solution])],
})
export class SolutionsModule { }
