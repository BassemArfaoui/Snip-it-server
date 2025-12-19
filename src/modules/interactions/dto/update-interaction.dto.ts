import { IsEnum, IsOptional } from 'class-validator';
import { ReactionTypeEnum } from '../../../common/enums/reaction-emoji.enum';

export class UpdateInteractionDto {
  @IsOptional()
  @IsEnum(ReactionTypeEnum)
  type?: ReactionTypeEnum;
}
