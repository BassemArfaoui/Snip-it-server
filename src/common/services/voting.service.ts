import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Vote } from '../entities/vote.entity';
import { VoteTargetType } from '../enums/vote-target.enum';
import { Issue } from '../../modules/issues/entities/issue.entity';
import { Solution } from '../../modules/solutions/entities/solution.entity';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class VotingService {
  private voteRepo: Repository<Vote>;

  constructor(private readonly dataSource: DataSource) {
    this.voteRepo = this.dataSource.getRepository(Vote);
  }

  async vote(dto: CreateVoteDto, userId: number): Promise<{ action: string; vote?: Vote }> {
    return this.dataSource.transaction(async (manager) => {
      // Verify target exists
      await this.verifyTargetExists(manager, dto.targetType, dto.targetId);

      // Check for existing vote
      const existingVote = await manager.findOne(Vote, {
        where: {
          user: { id: userId },
          targetId: dto.targetId,
          targetType: dto.targetType,
        },
      });

      if (existingVote) {
        // Toggle logic
        if (existingVote.isDislike === dto.isDislike) {
          // Remove vote (same vote clicked again)
          await manager.remove(existingVote);
          await this.updateTargetCounters(
            manager,
            dto.targetType,
            dto.targetId,
            dto.isDislike ? 'decrement_dislike' : 'decrement_like',
          );
          return { action: 'removed' };
        } else {
          // Change vote type
          await this.updateTargetCounters(
            manager,
            dto.targetType,
            dto.targetId,
            existingVote.isDislike ? 'decrement_dislike' : 'decrement_like',
          );
          existingVote.isDislike = dto.isDislike;
          const updatedVote = await manager.save(existingVote);
          await this.updateTargetCounters(
            manager,
            dto.targetType,
            dto.targetId,
            dto.isDislike ? 'increment_dislike' : 'increment_like',
          );
          return { action: 'changed', vote: updatedVote };
        }
      } else {
        // Create new vote
        const vote = manager.create(Vote, {
          user: { id: userId } as User,
          targetId: dto.targetId,
          targetType: dto.targetType,
          isDislike: dto.isDislike,
        });
        const savedVote = await manager.save(vote);
        await this.updateTargetCounters(
          manager,
          dto.targetType,
          dto.targetId,
          dto.isDislike ? 'increment_dislike' : 'increment_like',
        );
        return { action: 'created', vote: savedVote };
      }
    });
  }

  async getUserVotes(userId: number, targetType?: VoteTargetType): Promise<Vote[]> {
    const query: any = { user: { id: userId } };
    if (targetType) {
      query.targetType = targetType;
    }
    return this.voteRepo.find({ where: query });
  }

  async getVotesForTarget(targetType: VoteTargetType, targetId: number): Promise<{
    likes: number;
    dislikes: number;
  }> {
    const likes = await this.voteRepo.count({
      where: { targetType, targetId, isDislike: false },
    });
    const dislikes = await this.voteRepo.count({
      where: { targetType, targetId, isDislike: true },
    });
    return { likes, dislikes };
  }

  private async verifyTargetExists(
    manager: any,
    targetType: VoteTargetType,
    targetId: number,
  ): Promise<void> {
    let target;
    if (targetType === VoteTargetType.ISSUE) {
      target = await manager.findOne(Issue, { where: { id: targetId, isDeleted: false } });
      if (!target) throw new NotFoundException('Issue not found');
    } else if (targetType === VoteTargetType.SOLUTION) {
      target = await manager.findOne(Solution, { where: { id: targetId, isDeleted: false } });
      if (!target) throw new NotFoundException('Solution not found');
    }
  }

  private async updateTargetCounters(
    manager: any,
    targetType: VoteTargetType,
    targetId: number,
    action: 'increment_like' | 'decrement_like' | 'increment_dislike' | 'decrement_dislike',
  ): Promise<void> {
    const EntityClass = targetType === VoteTargetType.ISSUE ? Issue : Solution;
    
    if (action === 'increment_like') {
      await manager.increment(EntityClass, { id: targetId }, 'likesCount', 1);
    } else if (action === 'decrement_like') {
      await manager.decrement(EntityClass, { id: targetId }, 'likesCount', 1);
    } else if (action === 'increment_dislike') {
      await manager.increment(EntityClass, { id: targetId }, 'dislikesCount', 1);
    } else if (action === 'decrement_dislike') {
      await manager.decrement(EntityClass, { id: targetId }, 'dislikesCount', 1);
    }
  }
}
