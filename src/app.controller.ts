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
    this.logger.verbose('hello agent!!');
    return this.appService.getHello();
  }

}
