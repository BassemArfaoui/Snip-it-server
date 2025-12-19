import { ReactionTypeEnum } from '../enums/reaction-emoji.enum';

export const ReactionEmojiToGlyph: Record<ReactionTypeEnum, string> = {
  [ReactionTypeEnum.HEART]: '❤️',
  [ReactionTypeEnum.HELPFUL]: '💡',
  [ReactionTypeEnum.FIRE]: '🔥',
  [ReactionTypeEnum.FUNNY]: '😂',
  [ReactionTypeEnum.INCORRECT]: '❌',
};
