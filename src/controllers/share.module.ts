import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@app/config';
import { LoggerModule } from '@app/common';
import { ContextModule } from '@app/common';
import { HttpModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
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

    // Redis 模块 - 异步加载，依赖配置，全局可用
    RedisModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        return config.get('redis', {
          host: 'localhost',
          port: 6379,
        });
      },
      inject: [ConfigService],
    }, true),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return [
          {
            rootPath: join(__dirname, "../..", "dist/"),
            serveRoot: `/`,
            exclude: [], // 定义要排除的路径模式，这些路径不会被作为静态文件处理
            serveStaticOptions: {
              fallthrough: false, // 表示如果找不到请求的静态文件，继续传递请求给下一个中间件或路由处理器
            },
          },
        ];
      },
    }),
  ],
  exports: [ConfigModule, LoggerModule, ContextModule, HttpModule, RedisModule],
})
export class ShareModule { }
