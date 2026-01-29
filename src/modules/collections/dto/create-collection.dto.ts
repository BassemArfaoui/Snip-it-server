import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCollectionDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @IsOptional()
    @IsBoolean()
    allowEdit?: boolean;
}