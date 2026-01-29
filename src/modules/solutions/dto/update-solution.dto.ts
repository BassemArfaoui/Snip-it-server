import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength, ValidateNested } from 'class-validator';

export class UpdateSolutionSnippetDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Snippet title must be at least 2 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Snippet content is required' })
  content: string;

  @IsString()
  @IsNotEmpty()
  language: string;
}

export class UpdateSolutionDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Solution content must be at least 10 characters' })
  textContent?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSolutionSnippetDto)
  snippet?: UpdateSolutionSnippetDto;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  externalLink?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
