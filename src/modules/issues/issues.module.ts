import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { Issue } from './entities/issue.entity';
import { IssueRepository } from './repositories/issue.repository';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [TypeOrmModule.forFeature([Issue]), ProfileModule],
  controllers: [IssuesController],
  providers: [IssuesService, IssueRepository],
})
export class IssuesModule {}
