import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      // Skip logging for preflight requests
      if (method === 'OPTIONS') {
        return;
      }

      const status = statusCode >= 400 ? '❌' : statusCode >= 300 ? '↩️ ' : '✅';

      this.logger.log(
        `${status} ${method.padEnd(6)} ${originalUrl} - ${statusCode} - ${duration}ms`,
      );

      if (statusCode >= 400) {
        this.logger.warn(`Error ${statusCode}: ${method} ${originalUrl}`);
      }
    });

    next();
  }
}
