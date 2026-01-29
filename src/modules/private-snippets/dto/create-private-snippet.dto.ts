import { IsString, IsOptional } from 'class-validator';

export class CreatePrivateSnippetDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsString()
    content: string;

    @IsString()
    language: string;
}