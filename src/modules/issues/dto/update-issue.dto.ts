import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateIssueDto {
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
