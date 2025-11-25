import { Module, Global } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Global()
@Module({
  providers: [CaptchaService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
