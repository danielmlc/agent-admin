import { DynamicModule, Module } from '@nestjs/common';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions, HttpModuleAsyncOptions } from './http.interface';
import { HttpService } from './http.service';
@Module({})
export class HttpModule {
  static forRegister(
    options: HttpModuleOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      providers: [
        HttpService,
        {
          provide: HTTP_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }

  static forRegisterAsync(
    options: HttpModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      imports: options.imports,
      providers: [
        HttpService,
        {
          provide: HTTP_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }
}
