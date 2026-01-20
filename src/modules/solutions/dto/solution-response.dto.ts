import { Solution } from '../entities/solution.entity';

export class SolutionResponseDto {
  id: number;

  issueId: number;

  contributor: {
    id: number;
    username: string;
  } | null;

  textContent?: string;

  externalLink?: string;

  imageUrl?: string;

  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  isAccepted: boolean;

  createdAt: Date;
  updatedAt: Date;

  static fromEntity(solution: Solution): SolutionResponseDto {
    return {
      id: solution.id,
      issueId: solution.issue.id,

      contributor: solution.contributor ? {
        id: solution.contributor.id,
        username: solution.contributor.username,
      } : null,

      textContent: solution.textContent,
      externalLink: solution.externalLink,
      imageUrl: solution.imageUrl,

      likesCount: solution.likesCount,
      dislikesCount: solution.dislikesCount,
      commentsCount: solution.commentsCount,
      isAccepted: solution.isAccepted,

      createdAt: solution.createdAt,
      updatedAt: solution.updatedAt,
    };
  }
}
