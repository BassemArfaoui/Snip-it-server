import {
  Body,
  Controller,
  Delete,
  ParseEnumPipe,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { InteractionsService } from './interactions.service';
import { InteractionTargetType } from '../../common/enums/interaction-target-type.enum';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';

@Controller('/interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  async create(
    @Req() req: Request & { user?: JwtPayload },
    @Body() dto: CreateInteractionDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.interactionsService.create(Number(userId), dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: JwtPayload },
    @Body() dto: UpdateInteractionDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.interactionsService.update(id, Number(userId), dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.interactionsService.delete(id, Number(userId));
    return { success: true };
  }

  @Delete('target/:targetType/:targetId')
  async removeByTarget(
    @Param('targetType', new ParseEnumPipe(InteractionTargetType)) targetType: InteractionTargetType,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    await this.interactionsService.deleteByTarget(Number(userId), targetType, targetId);
    return { success: true };
  }
}
