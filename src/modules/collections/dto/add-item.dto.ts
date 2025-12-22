import { IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { CollectionItemEnum } from '../../../common/enums/collection-item.enum';

export class AddItemDto {
    @IsNumber()
    targetId: number;

    @IsEnum(CollectionItemEnum)
    targetType: CollectionItemEnum;

    // optional: pin or favorite on add
    @IsOptional()
    @IsBoolean()
    isPinned?: boolean;

    @IsOptional()
    @IsBoolean()
    isFavorite?: boolean;
}