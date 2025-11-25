import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@app/config';
import { LoggerService } from './logger';
import { configStrategyMap } from './setup';

type AsyncFunction = (app: any, config: ConfigService) => Promise<any>;

export async function bootstrap (
  rootModule: any, // 加载根模块
  appStartedCall?: AsyncFunction, // 启动中间回调
) {
  // 初始化应用对象
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    bufferLogs: true,
  });

  // 获取配置 根据配置加载对象
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // 根据配置策略启动相关设置
  for (const key of Object.keys(configStrategyMap)) {
    const strategy = new configStrategyMap[key](app, configService);
    await strategy.execute();
  }

  // 启动回调函数
  if (appStartedCall) {
    await appStartedCall(app, configService);
  }

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('捕获到未处理的Promise Rejection!', { reason, promise });
  });

  process.on('uncaughtException', (err, origin) => {
    logger.error('捕获到未处理的同步异常!', { err, origin });
  });
}
