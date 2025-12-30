import { IsEnum, IsInt } from 'class-validator';
import { CollectionPermission } from '../../../common/enums/collection-permission.enum';

export class AddCollaboratorDto {
    @IsInt()
    userId: number;

    @IsEnum(CollectionPermission)
    permission: CollectionPermission;
}
