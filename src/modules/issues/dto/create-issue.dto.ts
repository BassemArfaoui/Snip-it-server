import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: 'Issue title must be at least 4 characters' })
  @MaxLength(120, { message: 'Issue title must be at most 120 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Issue content must be at least 10 characters' })
  content: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}