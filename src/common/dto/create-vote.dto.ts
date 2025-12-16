import { IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { VoteTargetType } from '../enums/vote-target.enum';

export class CreateVoteDto {
  @IsNumber()
  targetId: number;

  @IsEnum(VoteTargetType)
  targetType: VoteTargetType;

  @IsBoolean()
  isDislike: boolean;
}
