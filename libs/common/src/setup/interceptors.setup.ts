import { SetupStrategy } from './setup.interface';
import { LoggerService } from '../logger';
import { LoggingInterceptor, TransformInterceptor } from '../components';

export class InterceptorsStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    const logger = this.app.get(LoggerService);
    //  请求日志拦截器
    if (this.configService.isConfig('loggerInterceptor')) {
      this.app.useGlobalInterceptors(
        new LoggingInterceptor(this.configService, logger),
      );
    }
    // 响应拦截器
    if (this.configService.isConfig('transformInterceptor')) {
      this.app.useGlobalInterceptors(new TransformInterceptor());
    }
  }
}
