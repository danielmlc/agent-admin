import { ConfigSchema } from './config.interface';

/**
 * 默认配置
 */
export const defaultConfig: ConfigSchema = {
  name: 'nest-app',
  port: 8080,
  serverPath: '',
  env: 'dev',
};
