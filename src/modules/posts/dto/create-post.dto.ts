import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    snippetContent: string;

    @IsString()
    @IsNotEmpty()
    snippetLanguage: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    snippetTitle?: string;

    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    githubLink?: string;
}
