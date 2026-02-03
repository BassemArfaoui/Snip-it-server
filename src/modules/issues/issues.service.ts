import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IssueRepository } from './repositories/issue.repository';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueResponseDto } from './dto/issue-response.dto';
import { Issue } from './entities/issue.entity';
import { User } from '../users/entities/user.entity';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class IssuesService {
  constructor(
    private readonly issueRepository: IssueRepository,
    private readonly dataSource: DataSource,
    private readonly profileService: ProfileService,
  ) {}

  async create(dto: CreateIssueDto, userId: number) {
    const issue = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.issueRepository.createIssue(
          {
            title: dto.title,
            content: dto.content,
            language: dto.language,
            imageUrl: dto.imageUrl,
            user,
          },
          manager,
      );
    });

    this.profileService
        .calculateAndPersistScore(userId)
        .catch(() => {});

    return IssueResponseDto.fromEntity(issue);
  }



  async findAll(query: {
    language?: string;
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }): Promise<IssueResponseDto[]> {
    const issues = await this.issueRepository.findAll(
      {
        language: query.language,
        isResolved: query.isResolved,
      },
      query.page ?? 1,
      query.limit ?? 10,
    );
    return issues.map(IssueResponseDto.fromEntity);
  }

  async findOne(issueId: number): Promise<IssueResponseDto> {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) throw new NotFoundException('Issue not found');
    return IssueResponseDto.fromEntity(issue);
  }

  async update(
    issueId: number,
    dto: UpdateIssueDto,
    userId: number,
  ): Promise<IssueResponseDto> {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) throw new NotFoundException('Issue not found');

    if (issue.user.id !== userId) {
      throw new ForbiddenException('You are not the owner');
    }

    const updated = await this.issueRepository.updateIssue(issueId, dto);
    if (!updated) throw new NotFoundException('Issue not found after update');
    return IssueResponseDto.fromEntity(updated);
  }

  async delete(issueId: number, userId: number) {
    await this.dataSource.transaction(async (manager) => {
      const issue =
          await this.issueRepository.findActiveByIdWithUser(
              issueId,
              manager,
          );

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      if (issue.user.id !== userId) {
        throw new ForbiddenException('You are not the owner');
      }

      await this.issueRepository.softDelete(issueId, manager);
    });

    this.profileService
        .calculateAndPersistScore(userId)
        .catch(() => {});
  }


  async resolve(issueId: number, userId: number) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) throw new NotFoundException('Issue not found');

    if (issue.user.id !== userId) {
      throw new ForbiddenException('You are not the owner');
    }

    await this.issueRepository.markResolved(issueId);
  }
}
