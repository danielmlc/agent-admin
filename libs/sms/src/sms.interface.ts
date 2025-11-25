import { ModuleMetadata } from '@nestjs/common';

export interface SendSmsDto {
  phoneNumbers: string;
  signName: string;
  templateCode: string;
  templateParam: string | object;
}

export interface SendBatchSmsDto {
  phoneNumberJson: string[];
  signNameJson: string;
  templateCode: string;
  templateParamJson: object[];
}

export interface SmsProvider {
  sendSms(sendSmsDto: SendSmsDto): Promise<any>;
  sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any>;
}

export interface BaseSmsConfig {
  provider: SmsSupper;
}

export enum SmsSupper {
  aliyun = 'aliyun',
  tencent = 'tencent',
}

export interface AliyunSmsConfig extends BaseSmsConfig {
  provider: SmsSupper.aliyun;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

export interface TencentSmsConfig extends BaseSmsConfig {
  provider: SmsSupper.tencent;
  secretId: string;
  secretKey: string;
  region?: string;
  sdkAppId: string;
  endpoint?: string;
}

export type SmsModuleOptions = AliyunSmsConfig | TencentSmsConfig;

export interface SmsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => SmsModuleOptions | Promise<SmsModuleOptions>;
  inject?: any[];
}
