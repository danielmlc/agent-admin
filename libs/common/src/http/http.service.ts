import { Injectable, Optional, Inject } from '@nestjs/common';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions, AxiosRequestInterceptors } from './http.interface';
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

@Injectable()
export class HttpService {
  private $http: AxiosInstance;
  private interceptors: AxiosRequestInterceptors;

  constructor(
    @Optional()
    @Inject(HTTP_MODULE_OPTIONS)
    protected options: HttpModuleOptions,
  ) {
    // 初始化实例
    this.$http = axios.create(options);
    this.interceptors = options.interceptors || {};

    // 设置实例级别的拦截器
    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   * @private
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.$http.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 处理全局配置
        if (this.options.debugAuth) {
          Object.assign(config.headers || {}, {
            'Content-Type': 'application/json',
            'x-service-endpoint': '1',
          });
        }

        // 执行用户自定义的请求拦截器
        if (this.interceptors?.requestInterceptor) {
          config = this.interceptors.requestInterceptor(config);
        }

        return config;
      },
      (error: any) => {
        // 执行用户自定义的请求错误拦截器
        if (this.interceptors?.requestInterceptorCatch) {
          return this.interceptors.requestInterceptorCatch(error);
        }
        return Promise.reject(error);
      },
    );

    // 响应拦截器
    this.$http.interceptors.response.use(
      (response: any) => {
        // 执行用户自定义的响应拦截器
        if (this.interceptors?.responseInterceptor) {
          response = this.interceptors.responseInterceptor(response);
        }
        return response;
      },
      (error: any) => {
        // 执行用户自定义的响应错误拦截器
        if (this.interceptors?.responseInterceptorCatch) {
          return this.interceptors.responseInterceptorCatch(error);
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * 发起请求
   * @param config axios配置信息
   * @returns 返回结果
   */
  request<T>(config: HttpModuleOptions<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.$http
        .request<any, T>(config)
        .then((res: T) => {
          resolve(res);
        })
        .catch((err: any) => {
          reject(err);
        });
    });
  }

  /**
   * get请求
   * @param url 请求地址
   * @param config 配置
   * @returns 返回结果
   */
  get<T = any>(url: string, config?: AxiosRequestConfig<T>): Promise<T> {
    return this.request<T>({
      url,
      ...config,
      method: 'GET',
    });
  }

  /**
   * post请求
   * @param url 请求地址
   * @param data body参数
   * @param config 配置
   * @returns 返回结果
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({
      url,
      ...config,
      data,
      method: 'POST',
    });
  }

  /**
   * put请求
   * @param url 请求地址
   * @param data body参数
   * @param config 配置
   * @returns 返回结果
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({
      url,
      ...config,
      data,
      method: 'PUT',
    });
  }

  /**
   * delete请求
   * @param url 请求地址
   * @param data body参数
   * @param config 配置
   * @returns 返回结果
   */
  delete<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({
      url,
      ...config,
      data: data,
      method: 'DELETE',
    });
  }

  /**
   * 获取axios实例（用于高级用法）
   * @returns AxiosInstance
   */
  getAxiosInstance(): AxiosInstance {
    return this.$http;
  }

  /**
   * 动态添加请求拦截器
   * @param onFulfilled 成功回调
   * @param onRejected 失败回调
   * @returns 拦截器ID
   */
  addRequestInterceptor(
    onFulfilled?: (
      value: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
    onRejected?: (error: any) => any,
  ): number {
    return this.$http.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * 动态添加响应拦截器
   * @param onFulfilled 成功回调
   * @param onRejected 失败回调
   * @returns 拦截器ID
   */
  addResponseInterceptor(
    onFulfilled?: (value: any) => any | Promise<any>,
    onRejected?: (error: any) => any,
  ): number {
    return this.$http.interceptors.response.use(onFulfilled, onRejected);
  }

  /**
   * 移除请求拦截器
   * @param interceptorId 拦截器ID
   */
  removeRequestInterceptor(interceptorId: number): void {
    this.$http.interceptors.request.eject(interceptorId);
  }

  /**
   * 移除响应拦截器
   * @param interceptorId 拦截器ID
   */
  removeResponseInterceptor(interceptorId: number): void {
    this.$http.interceptors.response.eject(interceptorId);
  }
}
