import { IsOptional, IsString } from 'class-validator';

export class UpdatePrivateSnippetDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    language?: string;
}
