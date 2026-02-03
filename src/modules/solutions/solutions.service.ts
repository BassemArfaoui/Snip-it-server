import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import {DataSource} from 'typeorm';
import {SolutionRepository} from './repositories/solution.repository';
import {CreateSolutionDto} from './dto/create-solution.dto';
import {UpdateSolutionDto} from './dto/update-solution.dto';
import {Issue} from '../issues/entities/issue.entity';
import {User} from '../users/entities/user.entity';
import {Solution} from './entities/solution.entity';
import {ProfileService} from '../profile/profile.service';
import {Snippet} from '../snippet/entities/snippet.entity';

@Injectable()
export class SolutionsService {
    constructor(
        private readonly solutionRepo: SolutionRepository,
        private readonly dataSource: DataSource,
        private readonly profileService: ProfileService,
    ) {
    }


    async create(
        issueId: number,
        contributor: User,
        dto: CreateSolutionDto,
    ): Promise<Solution> {
        if (
            !dto.textContent &&
            !dto.externalLink &&
            !dto.imageUrl &&
            !dto.snippet
        ) {
            throw new BadRequestException(
                'Either textContent, snippet, externalLink, or imageUrl must be provided',
            );
        }

        const solution = await this.dataSource.transaction(async (manager) => {
            const issue = await manager.findOne(Issue, {
                where: {id: issueId, isDeleted: false},
                relations: ['user'],
            });

            if (!issue) {
                throw new NotFoundException('Issue not found');
            }

            if (issue.isResolved) {
                throw new BadRequestException('Issue is already resolved');
            }

            let snippet: Snippet | undefined;

            if (dto.snippet) {
                snippet = manager.create(Snippet, {
                    title: dto.snippet.title,
                    content: dto.snippet.content,
                    language: dto.snippet.language,
                });
            }

            const solution = manager.create(Solution, {
                issue,
                contributor,
                textContent: dto.textContent,
                externalLink: dto.externalLink,
                imageUrl: dto.imageUrl,
                snippet,
            });

            const savedSolution = await manager.save(solution);

            await manager.increment(
                Issue,
                {id: issue.id},
                'solutionsCount',
                1,
            );

            await manager.increment(
                User,
                {id: contributor.id},
                'solutionsCount',
                1,
            );

            await manager.increment(
                User,
                {id: contributor.id},
                'contributorScore',
                1,
            );

            return savedSolution;
        });


        this.profileService
            .calculateAndPersistScore(contributor.id)
            .catch(() => {
            });

        return solution;
    }

    async findByIssue(issueId: number): Promise<Solution[]> {
        return this.solutionRepo.findByIssue(issueId);
    }

    async findOne(solutionId: number): Promise<Solution> {
        const solution = await this.solutionRepo.findActiveById(solutionId);

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
            throw new ForbiddenException(
                'Only the contributor can update this solution',
            );
        }

        if (solution.isAccepted) {
            throw new BadRequestException(
                'Cannot update an accepted solution',
            );
        }

        const {snippet, ...rest} = dto;
        Object.assign(solution, rest);

        if (snippet) {
            if (solution.snippet) {
                Object.assign(solution.snippet, snippet);
            } else {
                solution.snippet = Object.assign(new Snippet(), snippet);
            }
        }

        return this.solutionRepo.save(solution);
    }


    async delete(solutionId: number, user: User): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const solution =
                await this.solutionRepo.findActiveById(solutionId, manager);

            if (!solution) {
                throw new NotFoundException('Solution not found');
            }

            if (solution.contributor.id !== user.id) {
                throw new ForbiddenException(
                    'Only the contributor can delete this solution',
                );
            }

            if (solution.isAccepted) {
                throw new BadRequestException(
                    'Cannot delete an accepted solution',
                );
            }

            await this.solutionRepo.softDelete(solutionId, manager);

            await manager.decrement(
                Issue,
                {id: solution.issue.id},
                'solutionsCount',
                1,
            );

            await manager.decrement(
                User,
                {id: solution.contributor.id},
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

    // Admin: delete any solution (bypass ownership checks)
    async adminDelete(solutionId: number): Promise<void> {
      return this.dataSource.transaction(async (manager) => {
        const solution = await manager.findOne(Solution, {
          where: { id: solutionId, isDeleted: false },
          relations: ['contributor', 'issue'],
        });

        if (!solution) {
          throw new NotFoundException('Solution not found');
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

        // Recalculate contributor score based on actual data
        await this.profileService.calculateAndPersistScore(solution.contributor.id);
      });
    }

    async acceptSolution(solutionId: number, user: User): Promise<Solution> {
    const solution = await this.dataSource.transaction(async (manager) => {
      const solution = await manager.findOne(Solution, {
        where: { id: solutionId, isDeleted: false },
        relations: ['contributor', 'issue', 'issue.user', 'snippet'],
      });

      if (!solution) {
        throw new NotFoundException('Solution not found');
      }

      if (solution.issue.user.id !== user.id) {
        throw new ForbiddenException('Only the issue owner can accept a solution');
      }

      if (solution.issue.isResolved) {
        throw new BadRequestException('Issue is already resolved');
      }

      if (solution.isAccepted) {
        throw new BadRequestException('Solution is already accepted');
      }

      await this.solutionRepo.markAsAccepted(solutionId, manager);

      await manager.update(Issue, { id: solution.issue.id }, { isResolved: true });

      await manager.increment(User, { id: solution.contributor.id }, 'contributorScore', 5);

      solution.isAccepted = true;
      return solution;
    });

    // Recalculate contributor score after transaction completes
    await this.profileService.calculateAndPersistScore(solution.contributor.id).catch(() => {});

    return solution;
    }
}

