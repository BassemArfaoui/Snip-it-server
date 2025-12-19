import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    snippetContent?: string;

    @IsOptional()
    @IsString()
    snippetLanguage?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    snippetTitle?: string;

    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    githubLink?: string;
}
