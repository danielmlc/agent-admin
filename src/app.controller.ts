import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from '@app/common';
import { ConfigService } from '@app/config';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) { }

  @Get()
  getHello (): string {
    return this.appService.getHello();
  }

  @Get('info')
  getAppInfo () {
    this.logger.debug('sadsadsadsadsa', this.config.getAll());
    return this.appService.getAppInfo();
  }

  @Get('config/database')
  getDatabaseConfig () {
    return this.appService.getDatabaseConfig();
  }

  @Get('config/all')
  getAllConfig () {
    return this.appService.getAllConfig();
  }
}
