import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolutionsService } from './solutions.service';
import { SolutionsController } from './solutions.controller';
import { SolutionRepository } from './repositories/solution.repository';
import { Solution } from './entities/solution.entity';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [TypeOrmModule.forFeature([Solution]), ProfileModule],
  providers: [SolutionsService, SolutionRepository],
  controllers: [SolutionsController],
  exports: [SolutionsService],
})
export class SolutionsModule {}