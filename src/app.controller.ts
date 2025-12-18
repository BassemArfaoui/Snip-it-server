import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import { JwtPayload } from 'jsonwebtoken';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('whoami')
  whoAmI(@Req() req: Request & { user?: JwtPayload }) {
    const u = req.user;

    return { userId: u?.userId };
  }
}
