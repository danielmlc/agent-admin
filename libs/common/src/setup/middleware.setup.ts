import { SetupStrategy } from './setup.interface';
import { ContextService, LoggerService } from '../';
import { ContextMiddleware } from '../components/middleware/context.middleware';

export class MiddlewareStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    // cors配置
    if (this.configService.isConfig('cors')) {
      const corsConfig = this.configService.get('cors');
      this.app.enableCors(corsConfig);
    }

    // 上下文中间件
    if (this.configService.isConfig('contextMiddleware')) {
      const contextService = this.app.get(ContextService);
      const loggerService = this.app.get(LoggerService);
      this.app.use((req, res, next) => {
        const middleware = new ContextMiddleware(contextService, loggerService);
        return middleware.use(req, res, next);
      });
    }
  }
}
