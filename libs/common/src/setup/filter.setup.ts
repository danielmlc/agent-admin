import { SetupStrategy } from './setup.interface';
import { LoggerService } from '../logger';
import { UnifiedExceptionFilter } from '../components';

export class FilterStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    const logger = this.app.get(LoggerService);
    if (this.configService.isConfig('exceptionFilter')) {
      this.app.useGlobalFilters(
        new UnifiedExceptionFilter(this.configService, logger),
      );
    }
  }
}
