import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../../logger';
import { ErrorResult } from '../../dto';
import { ConfigService } from '@app/config';

@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  private isHttpException (exception: unknown): exception is HttpException {
    return (
      exception instanceof HttpException ||
      (exception?.constructor?.name === 'HttpException' &&
        typeof (exception as any).getStatus === 'function')
    );
  }

  private getErrorMessage (exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as any).message;
      return Array.isArray(message) ? message[0] : message;
    }
    return 'Internal server error';
  }

  catch (exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 获取配置
    const config = this.configService.get('exceptionFilter');
    const includeStack_response = config?.stack?.response || false;
    const includeStack_logger = config?.stack?.logger || false;

    // 处理 HTTP 异常
    if (this.isHttpException(exception)) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 处理重定向
      if (
        status === HttpStatus.FOUND &&
        typeof exceptionResponse === 'object' &&
        'redirectUrl' in exceptionResponse
      ) {
        return response.redirect((exceptionResponse as any).redirectUrl);
      }

      const errorResponse: ErrorResult = {
        code: status,
        message: this.getErrorMessage(exceptionResponse),
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      // 记录错误日志
      if (includeStack_logger) {
        this.logger.error(
          {
            ...errorResponse,
            stack: exception.stack,
          },
          'HttpExceptionFilter',
        );
      } else {
        this.logger.error(errorResponse, 'HttpExceptionFilter');
      }

      if (includeStack_response) {
        errorResponse.stack = exception.stack;
      }

      return response.status(status).json(errorResponse);
    }

    // 处理其他未知异常
    const errorResponse: ErrorResult = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // 记录错误日志
    if (includeStack_logger) {
      this.logger.error(
        {
          ...errorResponse,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'ExceptionFilter',
      );
    } else {
      this.logger.error(errorResponse, 'ExceptionFilter');
    }

    if (includeStack_response) {
      errorResponse.stack =
        exception instanceof Error ? exception.stack : undefined;
    }

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse);
  }
}
