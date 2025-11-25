import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@app/config';
import { LoggerModule } from '@app/common';
import { ContextModule } from '@app/common';
import { HttpModule } from '@app/common';

/**
 * 共享模块 - 全局共享的库模块
 * 所有从 libs 引入的模块都在这里统一管理
 */
@Global()
@Module({
  imports: [
    // 配置模块 - 异步加载
    ConfigModule.forRoot({
      configFilePath: './config.yaml',
      isGlobal: true,
    }),

    // 日志模块 - 异步加载，依赖配置
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        console.log(11111, config.getAll());
        return {
          ...config.get('logger'),
        };
      },
    }),

    // 上下文模块 - 同步加载（没有 forRootAsync 方法）
    ContextModule.forRoot({
      enableCaching: true,
    }),

    // HTTP 模块 - 异步加载，依赖配置
    HttpModule.forRegisterAsync({
      useFactory: async (config: ConfigService) => {
        return {
          ...config.get('httpClient'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [ConfigModule, LoggerModule, ContextModule, HttpModule],
})
export class ShareModule { }
