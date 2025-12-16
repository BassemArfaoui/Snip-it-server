import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VotingService } from '../voting.service';
import { Vote } from '../../entities/vote.entity';
import { VoteTargetType } from '../../enums/vote-target.enum';
import { Issue } from '../../../modules/issues/entities/issue.entity';
import { Solution } from '../../../modules/solutions/entities/solution.entity';

describe('VotingService', () => {
  let service: VotingService;
  let dataSource: DataSource;

  const mockVoteRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
    getRepository: jest.fn(() => mockVoteRepo),
  };

  const mockEntityManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotingService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<VotingService>(VotingService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('vote - create new vote', () => {
    it('should create a new like vote for an issue', async () => {
      const dto = {
        targetId: 1,
        targetType: VoteTargetType.ISSUE,
        isDislike: false,
      };
      const userId = 1;

      const mockIssue = { id: 1, isDeleted: false } as Issue;
      const mockVote = { id: 1, ...dto, user: { id: userId } } as Vote;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockIssue) // Target exists
        .mockResolvedValueOnce(null); // No existing vote
      mockEntityManager.create.mockReturnValue(mockVote);
      mockEntityManager.save.mockResolvedValue(mockVote);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.vote(dto, userId);

      expect(result.action).toBe('created');
      expect(result.vote).toEqual(mockVote);
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        Issue,
        { id: dto.targetId },
        'likesCount',
        1,
      );
    });

    it('should create a new dislike vote for a solution', async () => {
      const dto = {
        targetId: 1,
        targetType: VoteTargetType.SOLUTION,
        isDislike: true,
      };
      const userId = 1;

      const mockSolution = { id: 1, isDeleted: false } as Solution;
      const mockVote = { id: 1, ...dto, user: { id: userId } } as Vote;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockSolution) // Target exists
        .mockResolvedValueOnce(null); // No existing vote
      mockEntityManager.create.mockReturnValue(mockVote);
      mockEntityManager.save.mockResolvedValue(mockVote);
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.vote(dto, userId);

      expect(result.action).toBe('created');
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        Solution,
        { id: dto.targetId },
        'dislikesCount',
        1,
      );
    });
  });

  describe('vote - toggle existing vote', () => {
    it('should remove vote when same vote clicked again', async () => {
      const dto = {
        targetId: 1,
        targetType: VoteTargetType.ISSUE,
        isDislike: false,
      };
      const userId = 1;

      const mockIssue = { id: 1, isDeleted: false } as Issue;
      const existingVote = {
        id: 1,
        user: { id: userId },
        targetId: 1,
        targetType: VoteTargetType.ISSUE,
        isDislike: false,
      } as Vote;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockIssue) // Target exists
        .mockResolvedValueOnce(existingVote); // Existing vote
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.vote(dto, userId);

      expect(result.action).toBe('removed');
      expect(mockEntityManager.remove).toHaveBeenCalledWith(existingVote);
      expect(mockEntityManager.decrement).toHaveBeenCalledWith(
        Issue,
        { id: dto.targetId },
        'likesCount',
        1,
      );
    });

    it('should change from like to dislike', async () => {
      const dto = {
        targetId: 1,
        targetType: VoteTargetType.ISSUE,
        isDislike: true, // Want dislike
      };
      const userId = 1;

      const mockIssue = { id: 1, isDeleted: false } as Issue;
      const existingVote = {
        id: 1,
        user: { id: userId },
        targetId: 1,
        targetType: VoteTargetType.ISSUE,
        isDislike: false, // Currently like
      } as Vote;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockIssue) // Target exists
        .mockResolvedValueOnce(existingVote); // Existing vote
      mockEntityManager.save.mockResolvedValue({
        ...existingVote,
        isDislike: true,
      });
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.vote(dto, userId);

      expect(result.action).toBe('changed');
      expect(mockEntityManager.decrement).toHaveBeenCalledWith(
        Issue,
        { id: dto.targetId },
        'likesCount',
        1,
      );
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        Issue,
        { id: dto.targetId },
        'dislikesCount',
        1,
      );
    });

    it('should change from dislike to like', async () => {
      const dto = {
        targetId: 1,
        targetType: VoteTargetType.SOLUTION,
        isDislike: false, // Want like
      };
      const userId = 1;

      const mockSolution = { id: 1, isDeleted: false } as Solution;
      const existingVote = {
        id: 1,
        user: { id: userId },
        targetId: 1,
        targetType: VoteTargetType.SOLUTION,
        isDislike: true, // Currently dislike
      } as Vote;

      mockEntityManager.findOne
        .mockResolvedValueOnce(mockSolution) // Target exists
        .mockResolvedValueOnce(existingVote); // Existing vote
      mockEntityManager.save.mockResolvedValue({
        ...existingVote,
        isDislike: false,
      });
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      const result = await service.vote(dto, userId);

      expect(result.action).toBe('changed');
      expect(mockEntityManager.decrement).toHaveBeenCalledWith(
        Solution,
        { id: dto.targetId },
        'dislikesCount',
        1,
      );
      expect(mockEntityManager.increment).toHaveBeenCalledWith(
        Solution,
        { id: dto.targetId },
        'likesCount',
        1,
      );
    });
  });

  describe('vote - error handling', () => {
    it('should throw NotFoundException if issue not found', async () => {
      const dto = {
        targetId: 999,
        targetType: VoteTargetType.ISSUE,
        isDislike: false,
      };
      const userId = 1;

      mockEntityManager.findOne.mockResolvedValueOnce(null); // Issue not found
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.vote(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if solution not found', async () => {
      const dto = {
        targetId: 999,
        targetType: VoteTargetType.SOLUTION,
        isDislike: false,
      };
      const userId = 1;

      mockEntityManager.findOne.mockResolvedValueOnce(null); // Solution not found
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(mockEntityManager),
      );

      await expect(service.vote(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVotesForTarget', () => {
    it('should return likes and dislikes count', async () => {
      mockVoteRepo.count
        .mockResolvedValueOnce(10) // likes
        .mockResolvedValueOnce(3); // dislikes

      const result = await service.getVotesForTarget(VoteTargetType.ISSUE, 1);

      expect(result).toEqual({ likes: 10, dislikes: 3 });
      expect(mockVoteRepo.count).toHaveBeenCalledTimes(2);
    });
  });
});
