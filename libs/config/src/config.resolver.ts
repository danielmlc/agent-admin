import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { load } from 'js-yaml';
import { defaultsDeep } from 'lodash';
import { ConfigOptions, ConfigSchema, YamlConfigSchema } from './config.interface';
import { defaultConfig } from './config.default';
import { read2Env } from './config.env';


/**
 * 读取本地配置文件
 */
const readLocalFile = (filePath: string): YamlConfigSchema | null => {
  const absolutePath = resolve(process.cwd(), filePath);

  if (existsSync(absolutePath)) {
    try {
      const fileContent = readFileSync(absolutePath, 'utf8');
      return load(fileContent) as YamlConfigSchema;
    } catch (error) {
      console.error(`配置文件读取失败: ${filePath}`, error);
      return null;
    }
  }

  console.warn(`配置文件不存在: ${absolutePath}`);
  return null;
};

/**
 * 类型转换
 */
const convertType = (config: ConfigSchema): void => {
  for (const key in config) {
    const value = config[key];

    // 尝试转换为数字
    if (typeof value === 'string' && !isNaN(Number(value))) {
      config[key] = Number(value);
    }

    // 尝试转换为布尔值
    if (value === 'true' || value === 'false') {
      config[key] = value === 'true';
    }
  }
};

/**
 * 注入环境变量
 */
const injectEnv = (config: ConfigSchema): void => {
  // 从环境变量中读取配置，覆盖文件配置
  if (process.env.APP_NAME) config.name = process.env.APP_NAME;
  if (process.env.APP_PORT) config.port = Number(process.env.APP_PORT);
  if (process.env.APP_ENV) config.env = process.env.APP_ENV;
  if (process.env.APP_SERVER_PATH) config.serverPath = process.env.APP_SERVER_PATH;
};

/**
 * 解析配置
 */
export const resolveConfig = (options: ConfigOptions): ConfigSchema => {
  const configFilePath = options.configFilePath || './config.yaml';

  // 读取本地配置文件
  const localConfigFile = readLocalFile(configFilePath);

  if (!localConfigFile) {
    console.warn('未找到配置文件，使用默认配置');
    return { ...defaultConfig };
  }

  const localConfig = localConfigFile.application || {};
  const profilesActive = localConfig['profiles.active'] || process.env.PROFILES_ACTIVE || 'dev';

  // 按优先级合并多套配置
  const envArr = profilesActive.split(',').map(env => env.trim());
  let mergedConfig: ConfigSchema = {};

  // 按优先级从低到高合并（后面的 profile 会覆盖前面的）
  for (const env of envArr) {
    const profileKey = `profiles.${env}`;
    if (localConfigFile[profileKey]) {
      mergedConfig = defaultsDeep({}, localConfigFile[profileKey], mergedConfig);
    }
  }


  // 最终合并顺序（优先级从高到低）：
  // 1. profiles 环境配置（最高优先级，可覆盖 application 配置）
  // 2. application 应用配置（中等优先级，通用配置）
  // 3. 默认配置（最低优先级）
  let finalConfig = defaultsDeep(
    {},
    mergedConfig,     // 最高优先级：环境特定配置
    localConfig,      // 中等优先级：应用通用配置
    defaultConfig,    // 最低优先级：默认配置
  );


  // 清理 profiles 配置（已合并，不需要保留）
  for (const key in finalConfig) {
    if (key.startsWith('profiles.')) {
      delete finalConfig[key];
    }
  }

  // 类型转换
  convertType(finalConfig);

  // 注入环境变量
  injectEnv(finalConfig);

  // 将配置注入到 CS_ 前缀的环境变量中
  read2Env(finalConfig);

  return finalConfig;
};

