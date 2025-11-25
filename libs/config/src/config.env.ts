import { EnvConfig } from './config.interface';


/**
 * 默认环境变量配置
 * 这些配置项会被自动注入到环境变量中（以 CS_ 为前缀）
 */
export const defaultEnvConfig: EnvConfig = {
  host: 'localhost', // 默认值，实际值会在 read2Env 中动态获取
  port: 3000,
  name: 'nest-app',
  serverPath: '',
  env: 'dev',
  docs: {
    name: '',
    describe: '',
    version: '1.0.0',
  },
};

/**
 * 将配置读取到环境变量中
 * @param config 配置对象
 */
export const read2Env = (config: any): void => {
  // 将 defaultEnvConfig 中定义的配置项读取到环境变量中
  for (const key in defaultEnvConfig) {
    if (Object.prototype.hasOwnProperty.call(defaultEnvConfig, key)) {
      if (typeof defaultEnvConfig[key] === 'object' && defaultEnvConfig[key] !== null) {
        // 如果是对象，遍历对象的每个属性
        for (const ikey in defaultEnvConfig[key]) {
          const objectConfig = config[key] || defaultEnvConfig[key];
          process.env[`CS_${key.toUpperCase()}_${ikey.toUpperCase()}`] =
            String(objectConfig[ikey] || '');
        }
      } else {
        // 简单类型，直接设置环境变量
        let value = config[key] || defaultEnvConfig[key];
        process.env[`CS_${key.toUpperCase()}`] = String(value);
      }
    }
  }
};

