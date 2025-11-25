import { ModuleMetadata } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export interface AxiosRequestInterceptors<T = AxiosResponse> {
  // 请求成功
  requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
  // 请求失败
  requestInterceptorCatch?: (error: any) => any;
  // 响应成功
  responseInterceptor?: (res: T) => T;
  // 响应失败
  responseInterceptorCatch?: (error: any) => any;
}

export interface HttpModuleOptions<T = AxiosResponse>
  extends AxiosRequestConfig {
  interceptors?: AxiosRequestInterceptors<T>;
  debugAuth?: boolean;
  validateStatus?: ((status: number) => boolean) | null | undefined;
}

export interface HttpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => HttpModuleOptions | Promise<HttpModuleOptions>;
  inject?: any[];
}
