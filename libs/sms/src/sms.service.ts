import { Injectable, Optional, Inject } from '@nestjs/common';
import { SMS_MODULE_OPTIONS } from './sms.constants';
import {
  SmsModuleOptions,
  SmsProvider,
  SendSmsDto,
  SendBatchSmsDto,
  SmsSupper,
} from './sms.interface';
import { AliyunSmsProvider } from './providers/aliyun-sms.provider';
import { TencentSmsProvider } from './providers/tencent-sms.provider';

@Injectable()
export class SmsService {
  private smsClient: SmsProvider;

  constructor(
    @Optional()
    @Inject(SMS_MODULE_OPTIONS)
    protected options: SmsModuleOptions,
  ) {
    this.smsClient = this.createSmsProvider(this.options);
  }

  async sendSms(sendSmsDto: SendSmsDto): Promise<any> {
    return this.smsClient.sendSms(sendSmsDto);
  }

  async sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any> {
    return this.smsClient.sendBatchSms(sendBatchSmsDto);
  }

  private createSmsProvider(options: SmsModuleOptions): SmsProvider {
    const { provider } = options;
    switch (provider) {
      case SmsSupper.aliyun:
        return new AliyunSmsProvider(options);
      case SmsSupper.tencent:
        return new TencentSmsProvider(options);
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  }
}
