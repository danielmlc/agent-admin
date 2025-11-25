import { AppModule } from './app.module';
import { bootstrap } from '@app/common';
import { ConfigService } from '@app/config';

// 使用 bootstrap 方法启动应用
bootstrap(AppModule, async (app, configService: ConfigService) => {
  // 在这里可以添加自定义的启动逻辑
  const appName = configService.get<string>('name', 'app');
});

