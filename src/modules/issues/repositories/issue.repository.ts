import { Injectable } from '@nestjs/common';
import {DataSource, EntityManager, Repository, UpdateResult} from 'typeorm';
import { Issue } from '../entities/issue.entity';

@Injectable()
export class IssueRepository {
  private repo: Repository<Issue>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Issue);
  }

  async createIssue(data: Partial<Issue>, manager?: EntityManager,): Promise<Issue> {
    const repository = manager
        ? manager.getRepository(Issue)
        : this.repo;

    const issue = repository.create(data);
    return repository.save(issue);
  }
  async findById(issueId: number): Promise<Issue | null> {
    return this.repo.findOne({
      where: { id: issueId, isDeleted: false },
      relations: ['user', 'solutions'],
    });
  }

  async findByIdWithDeleted(issueId: number): Promise<Issue | null> {
    return this.repo.findOne({
      where: { id: issueId },
      relations: ['user', 'solutions'],
      withDeleted: true as any,
    });
  }

  async findAll(
    filters: { language?: string; isResolved?: boolean },
    page = 1,
    limit = 10,
    includeDeleted = false,
  ): Promise<Issue[]> {
    const qb = this.repo.createQueryBuilder('issue')
      .leftJoinAndSelect('issue.user', 'user')
      .orderBy('issue.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (!includeDeleted) qb.where('issue.isDeleted = false');

    if (filters.language) qb.andWhere('issue.language = :language', { language: filters.language });
    if (filters.isResolved !== undefined) qb.andWhere('issue.isResolved = :isResolved', { isResolved: filters.isResolved });

    return qb.getMany();
  }

  async updateIssue(issueId: number, data: Partial<Issue>): Promise<Issue | null> {

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length > 0) {
      await this.repo.update({ id: issueId }, updateData);
    }
    return this.findById(issueId);
  }
  async findActiveByIdWithUser(issueId: number, manager: EntityManager): Promise<Issue | null> {
    return this.repo.findOne({where: { id: issueId, isDeleted: false }, relations: ['user']});
  }

  async restoreIssue(issueId: number): Promise<Issue | null> {
    const issue = await this.findByIdWithDeleted(issueId);
    if (!issue) return null;
    issue.isDeleted = false as any;
    (issue as any).deletedAt = null;
    return this.repo.save(issue);
  }

  async softDelete(issueId: number, manager: EntityManager): Promise<void> {
    await this.repo.update({ id: issueId }, { isDeleted: true });
  }

  async markResolved(issueId: number): Promise<void> {
    await this.repo.update({ id: issueId }, { isResolved: true });
  }

  async incrementSolutionsCount(issueId: number): Promise<void> {
    await this.repo.increment({ id: issueId }, 'solutionsCount', 1);
  }
}