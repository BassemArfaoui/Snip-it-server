import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class IssueQueryDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBooleanString()
  is_resolved?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
