import { Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ContextService } from '../../context/context.service';
import { LoggerService } from '../../logger';
import { UserContext, CONTEXT_HEADER } from '../../context/context.interfaces';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    private readonly logger: LoggerService,
  ) { }

  private generateRequestId (): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  use (req: Request, res: Response, next: () => void) {
    // HTTP请求处理
    const requestId = this.generateRequestId();

    // 创建基础上下文
    const context: UserContext = {
      requestId: requestId,
      startTime: Date.now(),
      url: req.originalUrl,
      method: req.method,
      history: [],
    };

    this.contextService.runWithContext(context, async () => {
      next();
    });
  }
}
