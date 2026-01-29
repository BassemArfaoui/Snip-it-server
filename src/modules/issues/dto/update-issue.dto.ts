import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateIssueDto {
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Issue title must be at least 4 characters' })
  @MaxLength(120, { message: 'Issue title must be at most 120 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Issue content must be at least 10 characters' })
  content?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
