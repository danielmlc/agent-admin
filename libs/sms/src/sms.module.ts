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
