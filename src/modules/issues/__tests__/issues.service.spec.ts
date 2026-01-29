import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { IssuesService } from '../issues.service';
import { IssueRepository } from '../repositories/issue.repository';
import { Issue } from '../entities/issue.entity';
import { User } from '../../users/entities/user.entity';
import { ProfileService } from '../../profile/profile.service';

describe('IssuesService', () => {
  let service: IssuesService;
  let repository: IssueRepository;
  let dataSource: DataSource;

  const mockRepository = {
    createIssue: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    softDeleteById: jest.fn(),
    updateIssue: jest.fn(),
    markResolved: jest.fn(),
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

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  } as User;

  const mockIssue: Issue = {
    id: 1,
    title: 'test issue title',
    content: 'test issue content',
    language: 'javascript',
    user: mockUser,
    isResolved: false,
    isDeleted: false,
    solutionsCount: 0,
    likesCount: 0,
    dislikesCount: 0,
  } as Issue;

  const mockProfileService = {
    calculateAndPersistScore: jest.fn().mockResolvedValue(10),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        {
          provide: IssueRepository,
          useValue: mockRepository,
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

    service = module.get<IssuesService>(IssuesService);
    repository = module.get<IssueRepository>(IssueRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an issue successfully', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.create.mockReturnValue(mockIssue);
      mockEntityManager.save.mockResolvedValue(mockIssue);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.create(
        { title: 'test issue title', content: 'test issue content', language: 'javascript' },
        1,
      );

      expect(result).toBeDefined();
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 1 },
      });
      expect(mockEntityManager.create).toHaveBeenCalledWith(Issue, {
        title: 'test issue title',
        content: 'test issue content',
        language: 'javascript',
        user: mockUser,
      });
      expect(mockEntityManager.save).toHaveBeenCalled();
      expect(mockProfileService.calculateAndPersistScore).toHaveBeenCalledWith(1);
    });

    it('should use transaction for create', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.create.mockReturnValue(mockIssue);
      mockEntityManager.save.mockResolvedValue(mockIssue);

      await service.create(
        { title: 'test issue title', content: 'test issue content', language: 'javascript' },
        1,
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all issues with filters', async () => {
      const mockIssues = [mockIssue];
      mockRepository.findAll.mockResolvedValue(mockIssues);

      const result = await service.findAll({
        language: 'javascript',
        isResolved: false,
        page: 1,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        { language: 'javascript', isResolved: false },
        1,
        10,
      );
    });

    it('should apply default pagination', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.findAll({});

      expect(mockRepository.findAll).toHaveBeenCalledWith({}, 1, 10);
    });
  });

  describe('findOne', () => {
    it('should return an issue by id', async () => {
      mockRepository.findById.mockResolvedValue(mockIssue);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if issue not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Issue not found');
    });
  });

  describe('update', () => {
    it('should update an issue successfully', async () => {
      const updatedIssue = { ...mockIssue, content: 'updated content' };
      mockRepository.findById.mockResolvedValue(mockIssue);
      mockRepository.updateIssue.mockResolvedValue(updatedIssue);

      const result = await service.update(1, { content: 'updated content' }, 1);

      expect(result.content).toBe('updated content');
      expect(mockRepository.updateIssue).toHaveBeenCalledWith(1, {
        content: 'updated content',
      });
    });

    it('should throw NotFoundException if issue not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { content: 'updated' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockRepository.findById.mockResolvedValue(mockIssue);

      await expect(
        service.update(1, { content: 'updated' }, 999),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, { content: 'updated' }, 999),
      ).rejects.toThrow('You are not the owner');
    });
  });

  describe('delete', () => {
    it('should delete an issue successfully', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockIssue);
      mockEntityManager.update.mockResolvedValue({ affected: 1 });
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await service.delete(1, 1);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(Issue, {
        where: { id: 1, isDeleted: false },
        relations: ['user'],
      });
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Issue,
        { id: 1 },
        { isDeleted: true },
      );
    });

    it('should throw NotFoundException if issue not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockIssue);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.delete(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should use transaction for delete', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockIssue);
      mockEntityManager.update.mockResolvedValue({ affected: 1 });

      await service.delete(1, 1);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('should mark issue as resolved', async () => {
      mockRepository.findById.mockResolvedValue(mockIssue);
      mockRepository.markResolved.mockResolvedValue(undefined);

      await service.resolve(1, 1);

      expect(mockRepository.markResolved).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if issue not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.resolve(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockRepository.findById.mockResolvedValue(mockIssue);

      await expect(service.resolve(1, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

