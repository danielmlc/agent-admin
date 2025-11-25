### @cs/nest-sms代码库源码整理

#### 代码目录
```
@cs/nest-sms/
├── src/
├── providers/
│   ├── aliyun-sms.provider.ts
│   └── tencent-sms.provider.ts
├── index.ts
├── sms.constants.ts
├── sms.interface.ts
├── sms.module.ts
└── sms.service.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-sms",
  "version": "1.0.0",
  "description": "NestJS module for SMS sending, supporting multiple providers like Aliyun.",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "@alicloud/dysmsapi20170525": "^2.0.24",
    "@alicloud/openapi-client": "^0.4.8",
    "lodash": "^4.17.21",
    "tencentcloud-sdk-nodejs": "^4.1.47"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    }
  }
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './sms.module';
export * from './sms.service';
export * from './sms.interface';

```


> 代码路径  `src\sms.constants.ts`

```typescript
export const SMS_MODULE_OPTIONS = Symbol('SMS_MODULE_OPTIONS');

```


> 代码路径  `src\sms.interface.ts`

```typescript
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
  sendSms(sendSmsDto: SendSmsDto): Promise<any>; // 单条发送
  sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any>; // 批量发送
}

export interface BaseSmsConfig {
  provider: SmsSupper; // 公共配置参数
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

```


> 代码路径  `src\sms.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { SMS_MODULE_OPTIONS } from './sms.constants';
import { SmsModuleOptions, SmsModuleAsyncOptions } from './sms.interface';
import { SmsService } from './sms.service';
@Module({})
export class SmsModule {
  static forRoot(options: SmsModuleOptions, isGlobal = false): DynamicModule {
    return {
      global: isGlobal,
      module: SmsModule,
      providers: [
        {
          provide: SMS_MODULE_OPTIONS,
          useValue: options,
        },
        SmsService,
      ],
      exports: [SmsService, SMS_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: SmsModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: SmsModule,
      imports: options.imports || [],
      providers: [
        {
          provide: SMS_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        SmsService,
      ],
      exports: [SmsService, SMS_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\sms.service.ts`

```typescript
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
    // 初始化实例
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
        // 这里抛出错误，provider 确实是一个 string
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  }
}

```


> 代码路径  `src\providers\aliyun-sms.provider.ts`

```typescript
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
    // 验证必要参数
    if (!sendBatchSmsDto.phoneNumberJson?.length) {
      throw new Error('电话号码列表不能为空');
    }

    if (!sendBatchSmsDto.signNameJson) {
      throw new Error('签名不能为空');
    }

    // 获取电话号码数量
    const phoneCount = sendBatchSmsDto.phoneNumberJson.length;

    // 构建签名数组 - 为每个电话号码复制相同的签名
    const signNameJson = new Array(phoneCount).fill(
      sendBatchSmsDto.signNameJson,
    );

    // 构建请求参数对象
    const batchSmsDto = {
      templateCode: sendBatchSmsDto.templateCode, // templateCode保持原样
      phoneNumberJson: JSON.stringify(sendBatchSmsDto.phoneNumberJson),
      signNameJson: JSON.stringify(signNameJson),
      // 处理其他可能的参数
      ...(sendBatchSmsDto.templateParamJson && {
        templateParamJson: JSON.stringify(sendBatchSmsDto.templateParamJson),
      }),
    };
    // 创建请求对象并发送
    const params = new $Dysmsapi.SendBatchSmsRequest(batchSmsDto);
    const sendResp = await this.smsClient.sendBatchSms(params);
    return sendResp.body;
  }
}

```


> 代码路径  `src\providers\tencent-sms.provider.ts`

```typescript
import {
  SmsProvider,
  TencentSmsConfig,
  SendSmsDto,
  SendBatchSmsDto,
} from '../sms.interface';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

// 腾讯云短信服务实现
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
      // 处理模板参数
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

      console.log(
        'Tencent SMS sendSms params:',
        JSON.stringify(params, null, 2),
      );

      const response = await this.smsClient.SendSms(params);
      return response;
    } catch (error) {
      console.error('Tencent SMS sendSms error:', error);
      throw error;
    }
  }

  async sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<any> {
    try {
      // 腾讯云批量发送需要为每个手机号准备对应的模板参数
      let templateParamSet: string[][] = [];

      // 如果模板参数数组长度与手机号数组长度不匹配，使用第一个参数作为默认值
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
        SignName: sendBatchSmsDto.signNameJson, // 腾讯云批量发送使用统一签名
        TemplateId: sendBatchSmsDto.templateCode,
        TemplateParamSet: templateParamSet,
      };

      // console.log(
      //   'Tencent SMS sendBatchSms params:',
      //   JSON.stringify(params, null, 2),
      // );

      const response = await this.smsClient.SendSms(params);
      return response;
    } catch (error) {
      console.error('Tencent SMS sendBatchSms error:', error);
      throw error;
    }
  }
}

```

