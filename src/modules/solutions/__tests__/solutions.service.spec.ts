import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SolutionsService } from '../solutions.service';
import { SolutionRepository } from '../repositories/solution.repository';
import { Solution } from '../entities/solution.entity';
import { Issue } from '../../issues/entities/issue.entity';
import { User } from '../../users/entities/user.entity';
import { ProfileService } from '../../profile/profile.service';

describe('SolutionsService', () => {
  let service: SolutionsService;
  let repository: SolutionRepository;
  let dataSource: DataSource;

  const mockSolutionRepo = {
    repo: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
    findByIssue: jest.fn(),
    findById: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
    getRepository: jest.fn(),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  const mockProfileService = {
    calculateAndPersistScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolutionsService,
        {
          provide: SolutionRepository,
          useValue: mockSolutionRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    service = module.get<SolutionsService>(SolutionsService);
    repository = module.get<SolutionRepository>(SolutionRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a solution and increment counters', async () => {
      const issueId = 1;
      const contributor = { id: 2, username: 'contributor' } as User;
      const dto = { textContent: 'This is a solution', externalLink: null };

      const mockIssue = {
        id: issueId,
        isDeleted: false,
        isResolved: false,
        user: { id: 3 },
      } as Issue;

      const mockSolution = {
        id: 1,
        issue: mockIssue,
        contributor,
        textContent: dto.textContent,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockIssue);
      mockEntityManager.create.mockReturnValue(mockSolution);
      mockEntityManager.save.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const dtoWithoutNull = { ...dto, externalLink: undefined };
      const result = await service.create(issueId, contributor, dtoWithoutNull);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Issue, {
        where: { id: issueId, isDeleted: false },
        relations: ['user'],
      });
      expect(mockEntityManager.create).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockEntityManager.increment).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockSolution);
    });

    it('should throw NotFoundException if issue does not exist', async () => {
      const issueId = 999;
      const contributor = { id: 2 } as User;
      const dto = { textContent: 'Solution' };

      mockEntityManager.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.create(issueId, contributor, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if issue is already resolved', async () => {
      const issueId = 1;
      const contributor = { id: 2 } as User;
      const dto = { textContent: 'Solution' };

      const mockIssue = {
        id: issueId,
        isDeleted: false,
        isResolved: true,
      } as Issue;

      mockEntityManager.findOne.mockResolvedValue(mockIssue);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.create(issueId, contributor, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByIssue', () => {
    it('should return all solutions for an issue', async () => {
      const issueId = 1;
      const mockSolutions = [
        { id: 1, textContent: 'Solution 1' },
        { id: 2, textContent: 'Solution 2' },
      ] as Solution[];

      mockSolutionRepo.findByIssue.mockResolvedValue(mockSolutions);

      const result = await service.findByIssue(issueId);

      expect(mockSolutionRepo.findByIssue).toHaveBeenCalledWith(issueId);
      expect(result).toEqual(mockSolutions);
    });
  });

  describe('update', () => {
    it('should update a solution', async () => {
      const solutionId = 1;
      const user = { id: 2 } as User;
      const dto = { textContent: 'Updated solution' };

      const mockSolution = {
        id: solutionId,
        contributor: { id: user.id },
        isAccepted: false,
        textContent: 'Old solution',
      } as Solution;

      mockSolutionRepo.findById.mockResolvedValue(mockSolution);
      mockSolutionRepo.repo.save.mockResolvedValue({
        ...mockSolution,
        ...dto,
      });

      const result = await service.update(solutionId, user, dto);

      expect(mockSolutionRepo.findById).toHaveBeenCalledWith(solutionId);
      expect(mockSolutionRepo.repo.save).toHaveBeenCalled();
      expect(result.textContent).toBe(dto.textContent);
    });

    it('should throw ForbiddenException if user is not contributor', async () => {
      const solutionId = 1;
      const user = { id: 2 } as User;
      const dto = { textContent: 'Updated' };

      const mockSolution = {
        id: solutionId,
        contributor: { id: 999 },
        isAccepted: false,
      } as Solution;

      mockSolutionRepo.findById.mockResolvedValue(mockSolution);

      await expect(service.update(solutionId, user, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if solution is accepted', async () => {
      const solutionId = 1;
      const user = { id: 2 } as User;
      const dto = { textContent: 'Updated' };

      const mockSolution = {
        id: solutionId,
        contributor: { id: user.id },
        isAccepted: true,
      } as Solution;

      mockSolutionRepo.findById.mockResolvedValue(mockSolution);

      await expect(service.update(solutionId, user, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a solution and decrement counters', async () => {
      const solutionId = 1;
      const user = { id: 2 } as User;

      const mockSolution = {
        id: solutionId,
        contributor: { id: user.id },
        issue: { id: 10 },
        isAccepted: false,
        isDeleted: false,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await service.delete(solutionId, user);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Solution,
        { id: solutionId },
        { isDeleted: true },
      );
      expect(mockEntityManager.decrement).toHaveBeenCalledTimes(3);
    });

    it('should throw ForbiddenException if user is not contributor', async () => {
      const solutionId = 1;
      const user = { id: 2 } as User;

      const mockSolution = {
        id: solutionId,
        contributor: { id: 999 },
        isDeleted: false,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.delete(solutionId, user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptSolution', () => {
    it('should accept a solution and mark issue as resolved', async () => {
      const solutionId = 1;
      const issueOwner = { id: 3 } as User;

      const mockSolution = {
        id: solutionId,
        contributor: { id: 2 },
        issue: { id: 10, user: { id: issueOwner.id }, isResolved: false },
        isAccepted: false,
        isDeleted: false,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.acceptSolution(solutionId, issueOwner);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Solution,
        { id: solutionId },
        { isAccepted: true },
      );
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Issue,
        { id: mockSolution.issue.id },
        { isResolved: true },
      );
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        User,
        { id: mockSolution.contributor.id },
        'contributorScore',
        5,
      );
      expect(result.isAccepted).toBe(true);
    });

    it('should throw ForbiddenException if user is not issue owner', async () => {
      const solutionId = 1;
      const user = { id: 999 } as User;

      const mockSolution = {
        id: solutionId,
        issue: { id: 10, user: { id: 3 }, isResolved: false },
        isAccepted: false,
        isDeleted: false,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.acceptSolution(solutionId, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if issue is already resolved', async () => {
      const solutionId = 1;
      const issueOwner = { id: 3 } as User;

      const mockSolution = {
        id: solutionId,
        issue: { id: 10, user: { id: issueOwner.id }, isResolved: true },
        isAccepted: false,
        isDeleted: false,
      } as Solution;

      mockEntityManager.findOne.mockResolvedValue(mockSolution);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(
        service.acceptSolution(solutionId, issueOwner),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
