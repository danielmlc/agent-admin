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

}
