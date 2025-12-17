import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssueQueryDto } from './dto/issue-query.dto';
import { IssueResponseDto } from './dto/issue-response.dto';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('issues')
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateIssueDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: IssueQueryDto): Promise<IssueResponseDto[]> {
    const parsed = {
      language: query.language,
      isResolved:
        query.is_resolved === undefined
          ? undefined
          : query.is_resolved === 'true',
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    };

    return this.service.findAll(parsed);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<IssueResponseDto> {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.delete(id, user.id);
  }
}
