import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interaction } from './entities/interaction.entity';
import { User } from '../users/entities/user.entity';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateInteractionDto } from './dto/update-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(Interaction) private readonly interactionRepo: Repository<Interaction>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(requesterId: number, dto: CreateInteractionDto): Promise<Interaction> {
    const user = await this.userRepo.findOne({ where: { id: requesterId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const interaction = this.interactionRepo.create({
      user,
      targetType: dto.targetType,
      targetId: dto.targetId,
      type: dto.type,
    });

    return this.interactionRepo.save(interaction);
  }

  async update(id: number, requesterId: number, dto: UpdateInteractionDto): Promise<Interaction> {
    const interaction = await this.interactionRepo.findOne({ where: { id }, relations: ['user'] });
    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    if (interaction.user?.id !== requesterId) {
      throw new ForbiddenException('You are not the owner');
    }

    if (dto.type !== undefined) {
      interaction.type = dto.type;
    }

    return this.interactionRepo.save(interaction);
  }

  async delete(id: number, requesterId: number): Promise<void> {
    const interaction = await this.interactionRepo.findOne({ where: { id }, relations: ['user'] });
    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    if (interaction.user?.id !== requesterId) {
      throw new ForbiddenException('You are not the owner');
    }

    await this.interactionRepo.delete({ id });
  }
}
