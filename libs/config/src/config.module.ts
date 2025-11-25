import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigOptions, ConfigAsyncOptions, ConfigSchema } from './config.interface';
import { CONFIG_OPTIONS } from './config.constants';
import { resolveConfig } from './config.resolver';

/**
 * 配置模块
 */
@Module({})
export class ConfigModule {
  /**
   * 同步方式注册配置模块
   * @param options 配置选项
   */
  static forRoot(options: ConfigOptions = {}): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    return {
      module: ConfigModule,
      global: isGlobal,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: resolveConfig(options),
        },
        ConfigService,
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }

  /**
   * 异步方式注册配置模块
   * @param options 异步配置选项
   */
  static forRootAsync(options: ConfigAsyncOptions): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    return {
      module: ConfigModule,
      global: isGlobal,
      imports: options.imports || [],
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useFactory: async (...args: any[]): Promise<ConfigSchema> => {
            return await options.useFactory(...args);
          },
          inject: options.inject || [],
        },
        ConfigService,
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }
}
