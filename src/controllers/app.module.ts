import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShareModule } from './share.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeviceModule } from './modules/device/device.module';
import { ConfigModule } from './modules/config/config.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // 共享模块
    ShareModule,
    // 数据库模块
    DatabaseModule,
    // 用户模块
    UserModule,
    // 认证模块
    AuthModule,
    // 设备管理模块
    DeviceModule,
    // 配置管理模块
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局启用 JWT 守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }

