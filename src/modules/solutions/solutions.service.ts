import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SolutionRepository } from './repositories/solution.repository';
import { CreateSolutionDto } from './dto/create-solution.dto';
import { UpdateSolutionDto } from './dto/update-solution.dto';
import { Issue } from '../issues/entities/issue.entity';
import { User } from '../users/entities/user.entity';
import { Solution } from './entities/solution.entity';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class SolutionsService {
  constructor(
    private readonly solutionRepo: SolutionRepository,
    private readonly dataSource: DataSource,
    private readonly profileService: ProfileService,
  ) {}

  async create(
    issueId: number,
    contributor: User,
    dto: CreateSolutionDto,
  ): Promise<Solution> {
    // Validate that at least one field is provided
    if (!dto.textContent && !dto.externalLink) {
      throw new BadRequestException('Either textContent or externalLink must be provided');
    }

    return this.dataSource.transaction(async (manager) => {
      // Verify issue exists
      const issue = await manager.findOne(Issue, {
        where: { id: issueId, isDeleted: false },
        relations: ['user'],
      });

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      if (issue.isResolved) {
        throw new BadRequestException('Issue is already resolved');
      }

      // Create solution
      const solution = manager.create(Solution, {
        issue,
        contributor,
        textContent: dto.textContent,
        externalLink: dto.externalLink,
      });

      const savedSolution = await manager.save(solution);

      // Increment issue solutions count
      await manager.increment(
        Issue,
        { id: issueId },
        'solutionsCount',
        1,
      );

      // Increment contributor score
      await manager.increment(
        User,
        { id: contributor.id },
        'contributorScore',
        1,
      );

      // Increment contributor solutions count
      await manager.increment(
        User,
        { id: contributor.id },
        'solutionsCount',
        1,
      );

      return savedSolution;
    }).then(async (solution) => {
      // Recalculate contributor score after transaction completes
      await this.profileService.calculateAndPersistScore(contributor.id).catch(() => {
        // Ignore errors in score calculation
      });

      // TODO: Send notification to issue owner
      // await this.notificationService.notifyNewSolution(issue.user.id, solution);

      return solution;
    });
  }

  async findByIssue(issueId: number): Promise<Solution[]> {
    return this.solutionRepo.findByIssue(issueId);
  }

  async findOne(solutionId: number): Promise<Solution> {
    const solution = await this.solutionRepo.findById(solutionId);
    
    if (!solution) {
      throw new NotFoundException('Solution not found');
    }

    return solution;
  }

  async update(
    solutionId: number,
    user: User,
    dto: UpdateSolutionDto,
  ): Promise<Solution> {
    const solution = await this.findOne(solutionId);

    if (solution.contributor.id !== user.id) {
      throw new ForbiddenException('Only the contributor can update this solution');
    }

    if (solution.isAccepted) {
      throw new BadRequestException('Cannot update an accepted solution');
    }

    Object.assign(solution, dto);
    return this.solutionRepo.repo.save(solution);
  }

  async delete(solutionId: number, user: User): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const solution = await manager.findOne(Solution, {
        where: { id: solutionId, isDeleted: false },
        relations: ['contributor', 'issue'],
      });

      if (!solution) {
        throw new NotFoundException('Solution not found');
      }

      if (solution.contributor.id !== user.id) {
        throw new ForbiddenException('Only the contributor can delete this solution');
      }

      if (solution.isAccepted) {
        throw new BadRequestException('Cannot delete an accepted solution');
      }

      // Soft delete solution
      await manager.update(Solution, { id: solutionId }, { isDeleted: true });

      // Decrement issue solutions count
      await manager.decrement(
        Issue,
        { id: solution.issue.id },
        'solutionsCount',
        1,
      );

      // Decrement contributor score
      await manager.decrement(
        User,
        { id: solution.contributor.id },
        'contributorScore',
        1,
      );

      // Decrement contributor solutions count
      await manager.decrement(
        User,
        { id: solution.contributor.id },
        'solutionsCount',
        1,
      );
    }).then(async () => {
      // Recalculate contributor score after transaction completes
      await this.profileService.calculateAndPersistScore(user.id).catch(() => {
        // Ignore errors in score calculation
      });
    });
  }

  async acceptSolution(solutionId: number, user: User): Promise<Solution> {
    return this.dataSource.transaction(async (manager) => {
      const solution = await manager.findOne(Solution, {
        where: { id: solutionId, isDeleted: false },
        relations: ['contributor', 'issue', 'issue.user'],
      });

      if (!solution) {
        throw new NotFoundException('Solution not found');
      }

      // Only issue owner can accept solution
      if (solution.issue.user.id !== user.id) {
        throw new ForbiddenException('Only the issue owner can accept a solution');
      }

      if (solution.issue.isResolved) {
        throw new BadRequestException('Issue is already resolved');
      }

      if (solution.isAccepted) {
        throw new BadRequestException('Solution is already accepted');
      }

      // Mark solution as accepted
      await manager.update(Solution, { id: solutionId }, { isAccepted: true });

      // Mark issue as resolved
      await manager.update(Issue, { id: solution.issue.id }, { isResolved: true });

      // Bonus reward for contributor (additional points)
      await manager.increment(
        User,
        { id: solution.contributor.id },
        'contributorScore',
        5, // Bonus points for accepted solution
      );

      solution.isAccepted = true;
      return solution;
    }).then(async (solution) => {
      // Recalculate contributor score after transaction completes
      await this.profileService.calculateAndPersistScore(solution.contributor.id).catch(() => {
        // Ignore errors in score calculation
      });

      // TODO: Send notification to contributor
      // await this.notificationService.notifySolutionAccepted(solution.contributor.id, solution);

      return solution;
    });
  }
}
