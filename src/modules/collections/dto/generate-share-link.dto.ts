import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { CollectionPermission } from '../../../common/enums/collection-permission.enum';

export class GenerateShareLinkDto {
    @IsEnum(CollectionPermission)
    permission: CollectionPermission;

    @IsOptional()
    @IsInt()
    expiresInDays?: number;
}
