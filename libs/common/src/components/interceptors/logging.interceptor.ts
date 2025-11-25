import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { LoggerService } from '../../logger';
import { ConfigService } from '@app/config';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  intercept (context: ExecutionContext, next: CallHandler): Observable<any> {
    const loggerInterceptor = this.config.get('loggerInterceptor');
    if (!loggerInterceptor) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, url } = request;
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    // 收集请求信息
    const requestDetails = {
      method,
      url,
      handler,
      controller,
      // 可以根据配置决定是否记录
      ...(loggerInterceptor.moreInfo && {
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body,
      }),
    };

    this.logger.verbose(
      `>>>>>> Incoming Request: ${JSON.stringify(requestDetails)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        // 收集响应信息
        const responseDetails = {
          method,
          url,
          responseTime: `${responseTime}ms`,
          ...(loggerInterceptor.moreInfo && {
            statusCode: response.statusCode,
            responseBody: data,
          }),
        };
        // 记录响应信息
        this.logger.verbose(
          `<<<<<<Outgoing Response: ${JSON.stringify(responseDetails)}`,
        );
      }),
    );
  }
}
