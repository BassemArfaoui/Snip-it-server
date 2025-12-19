import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Interaction, User])],
    controllers: [InteractionsController],
    providers: [InteractionsService],
})
export class InteractionsModule { }
