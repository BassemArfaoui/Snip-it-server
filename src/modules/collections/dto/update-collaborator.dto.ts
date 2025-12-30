import { IsEnum } from 'class-validator';
import { CollectionPermission } from '../../../common/enums/collection-permission.enum';

export class UpdateCollaboratorDto {
    @IsEnum(CollectionPermission)
    permission: CollectionPermission;
}
