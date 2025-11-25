import { SetupStrategy } from './setup.interface';
import { LoggerConfigStrategy } from './logger.setup';
import { MiddlewareStrategy } from './middleware.setup';
import { InterceptorsStrategy } from './interceptors.setup';
import { PipesStrategy } from './pipes.setup';
import { FilterStrategy } from './filter.setup';
import { StartedStrategy } from './started.setup';
import { SwaggerStrategy } from './swagger.setup';
// 启动处理配置项
export const configStrategyMap: { [key: string]: typeof SetupStrategy } = {
  logger: LoggerConfigStrategy, // 日志配置
  middlewareStrategy: MiddlewareStrategy, //  中间件配置
  interceptorsStrategy: InterceptorsStrategy, // 拦截器配置
  pipesStrategy: PipesStrategy, // 管道配置
  filterStrategy: FilterStrategy, // 过滤器配置
  docs: SwaggerStrategy, // 文档配置
  started: StartedStrategy, // 启动配置
};

export * from './setup.interface';
export * from './logger.setup';
export * from './middleware.setup';
export * from './interceptors.setup';
export * from './pipes.setup';
export * from './filter.setup';
export * from './started.setup';
export * from './swagger.setup';