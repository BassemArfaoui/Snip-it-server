import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Interaction])],
})
export class InteractionsModule { }
