import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@app/config';
import { LoggerModule, ContextModule } from '@app/common';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      configFilePath: './config.yaml',
      isGlobal: true,
    }),
    // 日志模块
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        level: configService.get<'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'none'>('log.level', 'info'),
        dir: configService.get<string>('log.dir', './logs'),
        appLogName: configService.get<string>('log.appLogName', 'app-%DATE%.log'),
        errorLogName: configService.get<string>('log.errorLogName', 'error-%DATE%.log'),
        maxFiles: configService.get<string>('log.maxFiles', '14d'),
      }),
      inject: [ConfigService],
    }),
    // 上下文模块
    ContextModule.forRoot({
      enableCaching: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

