import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SolutionsService } from './solutions.service';
import { CreateSolutionDto } from './dto/create-solution.dto';
import { UpdateSolutionDto } from './dto/update-solution.dto';
import { SolutionResponseDto } from './dto/solution-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller()
export class SolutionsController {
  constructor(private readonly solutionsService: SolutionsService) {}

  // POST /issues/:issueId/solutions
  @UseGuards(JwtAuthGuard)
  @Post('issues/:issueId/solutions')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() dto: CreateSolutionDto,
    @CurrentUser() user: User,
  ) {
    const solution = await this.solutionsService.create(issueId, user, dto);
    return SolutionResponseDto.fromEntity(solution);
  }

  // GET /issues/:issueId/solutions
  @Get('issues/:issueId/solutions')
  async findAll(@Param('issueId', ParseIntPipe) issueId: number) {
    const solutions = await this.solutionsService.findByIssue(issueId);
    return solutions.map(SolutionResponseDto.fromEntity);
  }

  // PATCH /solutions/:id
  @UseGuards(JwtAuthGuard)
  @Patch('solutions/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolutionDto,
    @CurrentUser() user: User,
  ) {
    const solution = await this.solutionsService.update(id, user, dto);
    return SolutionResponseDto.fromEntity(solution);
  }

  // DELETE /solutions/:id
  @UseGuards(JwtAuthGuard)
  @Delete('solutions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.solutionsService.delete(id, user);
  }

  // PATCH /solutions/:id/accept
  @UseGuards(JwtAuthGuard)
  @Patch('solutions/:id/accept')
  async acceptSolution(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const solution = await this.solutionsService.acceptSolution(id, user);
    return SolutionResponseDto.fromEntity(solution);
  }
}
