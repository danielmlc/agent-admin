import {
  SmsProvider,
  AliyunSmsConfig,
  SendSmsDto,
  SendBatchSmsDto,
} from '../sms.interface';
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

export class AliyunSmsProvider implements SmsProvider {
  private smsClient: Dysmsapi;

  constructor(private options: AliyunSmsConfig) {
    this.createClient();
  }

  private createClient() {
    const config = new $OpenApi.Config({
      accessKeyId: this.options.accessKeyId,
      accessKeySecret: this.options.accessKeySecret,
      endpoint: this.options.endpoint,
    });
    this.smsClient = new Dysmsapi(config);
  }

  async sendSms(sendSmsDto: SendSmsDto): Promise<any> {
    sendSmsDto.templateParam = JSON.stringify(sendSmsDto.templateParam);
    const params = new $Dysmsapi.SendSmsRequest(sendSmsDto);
    const sendResp = await this.smsClient.sendSms(params);
    return sendResp.body;
  }

  async sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any> {
    if (!sendBatchSmsDto.phoneNumberJson?.length) {
      throw new Error('电话号码列表不能为空');
    }

    if (!sendBatchSmsDto.signNameJson) {
      throw new Error('签名不能为空');
    }

    const phoneCount = sendBatchSmsDto.phoneNumberJson.length;
    const signNameJson = new Array(phoneCount).fill(
      sendBatchSmsDto.signNameJson,
    );

    const batchSmsDto = {
      templateCode: sendBatchSmsDto.templateCode,
      phoneNumberJson: JSON.stringify(sendBatchSmsDto.phoneNumberJson),
      signNameJson: JSON.stringify(signNameJson),
      ...(sendBatchSmsDto.templateParamJson && {
        templateParamJson: JSON.stringify(sendBatchSmsDto.templateParamJson),
      }),
    };

    const params = new $Dysmsapi.SendBatchSmsRequest(batchSmsDto);
    const sendResp = await this.smsClient.sendBatchSms(params);
    return sendResp.body;
  }
}
