import { SetupStrategy } from './setup.interface';
import { ValidationPipe, HttpStatus } from '@nestjs/common';

export class PipesStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    const config = this.configService.get('validationPipe');
    if (this.configService.isConfig('validationPipe')) {
      this.app.useGlobalPipes(
        new ValidationPipe({
          ...config,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      );
    }
  }
}
