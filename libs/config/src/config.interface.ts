/**
 * 配置接口定义
 */

/**
 * 配置模块选项
 */
export interface ConfigOptions {
  /**
   * 配置文件路径，默认为 './config.yaml'
   */
  configFilePath?: string;

  /**
   * 是否为全局模块，默认为 true
   */
  isGlobal?: boolean;
}

/**
 * 异步配置模块选项
 */
export interface ConfigAsyncOptions {
  /**
   * 导入的模块
   */
  imports?: any[];

  /**
   * 工厂函数
   */
  useFactory: (...args: any[]) => Promise<ConfigSchema> | ConfigSchema;

  /**
   * 注入的依赖
   */
  inject?: any[];

  /**
   * 是否为全局模块，默认为 true
   */
  isGlobal?: boolean;
}

/**
 * YAML 配置文件结构
 */
export interface YamlConfigSchema {
  /**
   * 主配置
   */
  application: ConfigSchema;

  /**
   * 其他配置（如 profiles.dev, profiles.local 等）
   */
  [key: string]: any;
}

/**
 * 配置结构
 */
export interface ConfigSchema {
  /**
   * 应用名称
   */
  name?: string;

  /**
   * 端口
   */
  port?: number;

  /**
   * 服务路径
   */
  serverPath?: string;

  /**
   * 环境
   */
  env?: string;

  /**
   * 激活的配置文件，如 'dev,local'
   */
  'profiles.active'?: string;

  /**
   * 其他任意配置
   */
  [key: string]: any;
}

/**
 * 文档配置
 */
export interface Documnet {
  name: string;
  describe: string;
  version: string;
}

/**
 * 环境变量配置
 * 在这里定义的配置项会被自动注入到环境变量中（以 CS_ 为前缀）
 */
export interface EnvConfig {
  host: string;
  port: number;
  name: string;
  serverPath: string;
  env: string;
  docs: Documnet;
}

