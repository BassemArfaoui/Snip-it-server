import { IsOptional, IsString, IsUrl, MinLength, ValidateIf } from 'class-validator';

export class CreateSolutionDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Solution content must be at least 10 characters' })
  textContent?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  externalLink?: string;
}
