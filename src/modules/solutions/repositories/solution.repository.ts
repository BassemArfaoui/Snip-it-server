import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Solution } from '../entities/solution.entity';

@Injectable()
export class SolutionRepository {
  public repo: Repository<Solution>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Solution);
  }

  async findByIssue(issueId: number): Promise<Solution[]> {
    return this.repo.find({
      where: { issue: { id: issueId }, isDeleted: false },
      relations: ['contributor', 'issue', 'snippet'],
      order: { createdAt: 'ASC' },
    });
  }

  async findById(solutionId: number): Promise<Solution | null> {
    return this.repo.findOne({
      where: { id: solutionId, isDeleted: false },
      relations: ['contributor', 'issue', 'issue.user', 'snippet'],
    });
  }

  async softDelete(solutionId: number): Promise<void> {
    await this.repo.update({ id: solutionId }, { isDeleted: true });
  }

  async markAsAccepted(solutionId: number): Promise<void> {
    await this.repo.update({ id: solutionId }, { isAccepted: true });
  }

  async countBySolution(issueId: number): Promise<number> {
    return this.repo.count({
      where: { issue: { id: issueId }, isDeleted: false },
    });
  }
}
