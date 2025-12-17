import { Injectable } from '@nestjs/common';
import { DataSource, Repository, UpdateResult } from 'typeorm';
import { Issue } from '../entities/issue.entity';

@Injectable()
export class IssueRepository {
  private repo: Repository<Issue>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Issue);
  }

  async createIssue(data: Partial<Issue>): Promise<Issue> {
    const issue = this.repo.create(data);
    return this.repo.save(issue);
  }

  async findById(issueId: number): Promise<Issue | null> {
    return this.repo.findOne({
      where: { id: issueId, isDeleted: false },
      relations: ['user', 'solutions'],
    });
  }

  async findAll(
    filters: { language?: string; isResolved?: boolean },
    page = 1,
    limit = 10,
  ): Promise<Issue[]> {
    const qb = this.repo.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.user', 'user')
      .where('issue.isDeleted = false')
      .orderBy('issue.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.language) qb.andWhere('issue.language = :language', { language: filters.language });
    if (filters.isResolved !== undefined) qb.andWhere('issue.isResolved = :isResolved', { isResolved: filters.isResolved });

    return qb.getMany();
  }

  async updateIssue(issueId: number, data: Partial<Issue>): Promise<Issue | null> {
    await this.repo.update({ id: issueId }, data);
    return this.findById(issueId);
  }

  async softDeleteById(issueId: number): Promise<boolean> {
    const result: UpdateResult = await this.repo.update({ id: issueId, isDeleted: false }, { isDeleted: true });
    return result.affected !== 0;
  }

  async markResolved(issueId: number): Promise<void> {
    await this.repo.update({ id: issueId }, { isResolved: true });
  }

  async incrementSolutionsCount(issueId: number): Promise<void> {
    await this.repo.increment({ id: issueId }, 'solutionsCount', 1);
  }
}