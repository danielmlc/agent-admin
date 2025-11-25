import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigSchema } from './config.interface';
import { CONFIG_OPTIONS } from './config.constants';

/**
 * 配置服务
 */
@Injectable()
export class ConfigService {
  private readonly config: ConfigSchema;

  constructor(@Optional() @Inject(CONFIG_OPTIONS) config: ConfigSchema) {
    this.config = config || {};
  }

  /**
   * 获取指定键的配置值
   * @param key 配置键，支持点号分隔的嵌套路径，如 'database.host'
   * @param defaultValue 默认值
   */
  get<T = any> (key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * 检查配置键是否存在
   * @param key 配置键
   */
  has (key: string): boolean {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查配置项是否存在且有有效值（用于启用/禁用功能）
   * @param key 配置键
   * @returns 如果配置项存在且有有效值，返回 true；否则返回 false
   * 
   * 有效值的定义：
   * - true 或字符串 'true'
   * - 非空对象
   * - 非空数组
   * - 非零数字
   * - 非空字符串（除了 'false', '0', ''）
   */
  isConfig (key: string): boolean {
    const value = this.get(key);

    // undefined 或 null
    if (value === undefined || value === null) {
      return false;
    }

    // 布尔值
    if (typeof value === 'boolean') {
      return value;
    }

    // 字符串
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized !== 'false' && normalized !== '0' && normalized !== '';
    }

    // 数字
    if (typeof value === 'number') {
      return value !== 0;
    }

    // 数组：非空数组为 true
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // 对象：非空对象为 true
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    // 其他情况（函数等）
    return false;
  }


  /**
   * 获取所有配置
   */
  getAll (): ConfigSchema {
    return this.config;
  }
}
