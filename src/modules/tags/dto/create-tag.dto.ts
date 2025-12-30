import { IsString, IsOptional, IsHexColor, IsInt } from 'class-validator';

export class CreateTagDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsHexColor()
    color?: string;

    @IsOptional()
    @IsInt()
    order?: number;
}
