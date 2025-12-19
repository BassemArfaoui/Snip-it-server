import { IsEnum, IsInt, Min } from 'class-validator';
import { InteractionTargetType } from '../../../common/enums/interaction-target-type.enum';
import { ReactionTypeEnum } from '../../../common/enums/reaction-emoji.enum';

export class CreateInteractionDto {
  @IsEnum(InteractionTargetType)
  targetType: InteractionTargetType;

  @IsInt()
  @Min(1)
  targetId: number;

  @IsEnum(ReactionTypeEnum)
  type: ReactionTypeEnum;
}
