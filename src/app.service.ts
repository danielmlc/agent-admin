import { Injectable } from '@nestjs/common';
import { ConfigService } from '@app/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) { }

  getHello (): string {
    const appName = this.configService.get<string>('name', 'Unknown App');
    const port = this.configService.get<number>('port', 3000);
    return `Hello from ${appName} running on port ${port}!`;
  }

  getAppInfo () {
    return {
      name: this.configService.get<string>('name'),
      port: this.configService.get<number>('port'),
      env: this.configService.get<string>('env'),
      serverPath: this.configService.get<string>('serverPath'),
    };
  }

  getDatabaseConfig () {
    return {
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      database: this.configService.get<string>('database.database'),
      username: this.configService.get<string>('database.username'),
      // 不返回密码，仅用于演示配置读取
    };
  }

  getAllConfig () {
    return this.configService.getAll();
  }
}
