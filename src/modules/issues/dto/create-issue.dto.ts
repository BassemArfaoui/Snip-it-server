import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Issue content must be at least 10 characters' })
  content: string;

  @IsString()
  @IsNotEmpty()
  language: string;
}