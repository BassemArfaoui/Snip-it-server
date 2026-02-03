import {Injectable} from '@nestjs/common';
import {DataSource, EntityManager, Repository} from 'typeorm';
import {Solution} from '../entities/solution.entity';

@Injectable()
export class SolutionRepository {
    private readonly baseRepo: Repository<Solution>;

    constructor(private readonly dataSource: DataSource) {
        this.baseRepo = this.dataSource.getRepository(Solution);
    }

    private repo(manager?: EntityManager): Repository<Solution> {
        return manager
            ? manager.getRepository(Solution)
            : this.baseRepo;
    }

    async findByIssue(issueId: number): Promise<Solution[]> {
        return this.repo().find({
            where: {issue: {id: issueId}, isDeleted: false},
            relations: ['contributor', 'issue', 'snippet'],
            order: {createdAt: 'ASC'},
        });
    }

    async findActiveById(
        solutionId: number,
        manager?: EntityManager,
    ): Promise<Solution | null> {
        return this.repo(manager).findOne({
            where: {id: solutionId, isDeleted: false},
            relations: ['contributor', 'issue', 'issue.user', 'snippet'],
        });
    }

    async save(
        solution: Solution,
        manager?: EntityManager,
    ): Promise<Solution> {
        return this.repo(manager).save(solution);
    }

    async softDelete(
        solutionId: number,
        manager?: EntityManager,
    ): Promise<void> {
        await this.repo(manager).update(
            {id: solutionId},
            {isDeleted: true},
        );
    }

    async markAsAccepted(
        solutionId: number,
        manager?: EntityManager,
    ): Promise<void> {
        await this.repo(manager).update(
            {id: solutionId},
            {isAccepted: true},
        );
    }

    async countByIssue(issueId: number): Promise<number> {
        return this.repo().count({
            where: {issue: {id: issueId}, isDeleted: false},
        });
    }
}

