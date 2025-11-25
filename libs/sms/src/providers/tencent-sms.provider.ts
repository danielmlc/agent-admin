import {
  SmsProvider,
  TencentSmsConfig,
  SendSmsDto,
  SendBatchSmsDto,
} from '../sms.interface';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

export class TencentSmsProvider implements SmsProvider {
  private smsClient: any;

  constructor(private options: TencentSmsConfig) {
    this.createClient();
  }

  private createClient() {
    const SmsClient = tencentcloud.sms.v20210111.Client;

    const clientConfig = {
      credential: {
        secretId: this.options.secretId,
        secretKey: this.options.secretKey,
      },
      region: this.options.region || 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: this.options.endpoint || 'sms.tencentcloudapi.com',
        },
      },
    };

    this.smsClient = new SmsClient(clientConfig);
  }

  async sendSms(sendSmsDto: SendSmsDto): Promise<any> {
    try {
      let templateParamSet: string[] = [];
      if (sendSmsDto.templateParam) {
        if (typeof sendSmsDto.templateParam === 'string') {
          try {
            const parsed = JSON.parse(sendSmsDto.templateParam);
            templateParamSet = Object.values(parsed).map(String);
          } catch {
            templateParamSet = [sendSmsDto.templateParam];
          }
        } else if (typeof sendSmsDto.templateParam === 'object') {
          templateParamSet = Object.values(sendSmsDto.templateParam).map(
            String,
          );
        }
      }

      const params = {
        PhoneNumberSet: [sendSmsDto.phoneNumbers],
        SmsSdkAppId: this.options.sdkAppId,
        SignName: sendSmsDto.signName,
        TemplateId: sendSmsDto.templateCode,
        TemplateParamSet: templateParamSet,
      };

      const response = await this.smsClient.SendSms(params);
      return response;
    } catch (error) {
      console.error('Tencent SMS sendSms error:', error);
      throw error;
    }
  }

  async sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any> {
    try {
      let templateParamSet: string[][] = [];

      if (
        sendBatchSmsDto.templateParamJson.length !==
        sendBatchSmsDto.phoneNumberJson.length
      ) {
        const defaultParam = sendBatchSmsDto.templateParamJson[0] || {};
        templateParamSet = sendBatchSmsDto.phoneNumberJson.map(() =>
          Object.values(defaultParam).map(String),
        );
      } else {
        templateParamSet = sendBatchSmsDto.templateParamJson.map((param) =>
          Object.values(param).map(String),
        );
      }

      const params = {
        PhoneNumberSet: sendBatchSmsDto.phoneNumberJson,
        SmsSdkAppId: this.options.sdkAppId,
        SignName: sendBatchSmsDto.signNameJson,
        TemplateId: sendBatchSmsDto.templateCode,
        TemplateParamSet: templateParamSet,
      };

      const response = await this.smsClient.SendSms(params);
      return response;
    } catch (error) {
      console.error('Tencent SMS sendBatchSms error:', error);
      throw error;
    }
  }
}
