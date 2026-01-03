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
    return this.dataSource.transaction(async (manager) => {
      // Create issue
      const issue = manager.create(Issue, {
        content: dto.content,
        language: dto.language,
        user: { id: userId } as User,
      });

      const savedIssue = await manager.save(issue);

      // Recalculate contributor score for the user (simple formula)
      await this.profileService.calculateAndPersistScore(userId);

      return savedIssue;
    });
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
    return this.dataSource.transaction(async (manager) => {
      const issue = await manager.findOne(Issue, {
        where: { id: issueId, isDeleted: false },
        relations: ['user'],
      });

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      if (issue.user.id !== userId) {
        throw new ForbiddenException('You are not the owner');
      }

      // Soft delete issue and set deletedAt
      await manager.update(Issue, { id: issueId }, { isDeleted: true, deletedAt: new Date() });

      // Recalculate contributor score for the owner
      await this.profileService.calculateAndPersistScore(issue.user.id);

    });
  }

  // Admin: delete any issue
  async adminDelete(issueId: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // allow admin to find issue even if already deleted
      const issue = await manager.findOne(Issue, {
        where: { id: issueId },
        relations: ['user'],
        withDeleted: true as any,
      });

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      await manager.update(Issue, { id: issueId }, { isDeleted: true, deletedAt: new Date() });

      // Recalculate contributor score for the owner
      await this.profileService.calculateAndPersistScore(issue.user.id);
    });
  }

  // Admin: restore any issue
  async adminRestore(issueId: number): Promise<void> {
    // use repository helper to restore including soft-deleted rows
    const restored = await this.issueRepository.restoreIssue(issueId);
    if (!restored) throw new NotFoundException('Issue not found');
    // Recalculate score for the owner if available
    if (restored.user?.id) {
      await this.profileService.calculateAndPersistScore(restored.user.id);
    }
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
