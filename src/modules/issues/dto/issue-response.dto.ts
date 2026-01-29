import { Issue } from '../entities/issue.entity';

export class IssueResponseDto {
  id: number;
  title: string;
  content: string;
  language?: string;
  imageUrl?: string;
  solutions_count: number;
  is_resolved: boolean;
  likesCount: number;
  dislikesCount: number;
  created_at: Date;
  author: {
    id: number;
    username: string;
  } | null;

  static fromEntity(issue: Issue): IssueResponseDto {
    return {
      id: issue.id,
      title: issue.title,
      content: issue.content,
      language: issue.language,
      imageUrl: issue.imageUrl,
      solutions_count: issue.solutionsCount,
      is_resolved: issue.isResolved,
      likesCount: issue.likesCount,
      dislikesCount: issue.dislikesCount,
      created_at: issue.createdAt,
      author: issue.user ? {
        id: issue.user.id,
        username: issue.user.username,
      } : null,
    };
  }
}
