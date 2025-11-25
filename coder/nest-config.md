### @cs/nest-config代码库源码整理

#### 代码目录
```
@cs/nest-config/
├── src/
├── config/
│   ├── config.default.ts
│   ├── config.env.ts
│   ├── config.schema.interface.ts
│   └── constants.ts
├── config.module.ts
├── config.reslove.ts
├── config.service.ts
├── config.utlis.ts
├── index.ts
├── nacos.config.ts
└── nacos.constants.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-config",
  "version": "3.0.3",
  "description": "配置管理",
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
    "axios": "^0.27.2",
    "js-yaml": "^4.1.0",
    "lodash": "^4.17.21",
    "nacos": "^2.6.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    }
  }
}

```


> 代码路径  `src\config.module.ts`

```typescript
import { DynamicModule } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CONFIG_OPTIONS } from './config/constants';
import {
  ConfigOptions,
  ConfigAsyncOptions,
} from './config/config.schema.interface';
import { getRemoteConfig } from './config.utlis';

export class ConfigModule {
  static forRoot(options: ConfigOptions, isGlobal = true): DynamicModule {
    return {
      module: ConfigModule,
      global: isGlobal,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useFactory: async () => {
            // 异步获取配置数据
            return await getRemoteConfig(options);
          },
        },
        {
          provide: ConfigService,
          useFactory: (configData: any) => {
            return new ConfigService(configData);
          },
          inject: [CONFIG_OPTIONS],
        },
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }
  // 从外部获取配置初始化
  static forRootAsync(
    options: ConfigAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      module: ConfigModule,
      global: isGlobal,
      imports: options.imports,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        {
          provide: ConfigService,
          useFactory: (configData: any) => {
            return new ConfigService(configData);
          },
          inject: [CONFIG_OPTIONS],
        },
      ],
      exports: [ConfigService, CONFIG_OPTIONS],
    };
  }
}

```


> 代码路径  `src\config.reslove.ts`

```typescript
import { load } from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { defaultsDeep } from 'lodash';
import { resolve } from 'path';
import { Logger } from '@nestjs/common';
import {
  ConfigSchema,
  YamlConfigSchema,
  CoverConfig,
  ConfigOptions,
} from './config/config.schema.interface';
import { defaultConfig } from './config/config.default';
import { defaultEnvConfig } from './config/config.env';

const logger = new Logger('ConfigInitialize');

export const resloveConfig = (
  options: ConfigOptions,
  remoteConfig: any,
): ConfigSchema => {
  try {
    const { onlyLocal, configFilePath } = options;
    let currentConfig: ConfigSchema;
    const localConfig: YamlConfigSchema = readLocalFile(configFilePath);
    let profilesActive = '' as string;
    const localDevEnvs = ['dev', 'beta', 'dev-mc'];
    // 检测给运行环境给默认值
    if (!process.env.CS_SERVICEENV) {
      process.env.CS_SERVICEENV = 'dev';
    }
    // 加载本地文件
    if (localConfig) {
      profilesActive = localConfig.application['profiles.active'] || '';
    }
    // 合并配置
    if (onlyLocal) {
      // 只读本地配置
      currentConfig = defaultsDeep(
        localConfig.application,
        localConfig[`profiles.${profilesActive.split(',')[0]}`], // 本地配置
        defaultConfig, // 系统包默认配置
      );
    } else {
      const coverConfig = remoteConfig['applicationCover'];
      const appConfig = remoteConfig['application'].application;
      const serverConfig: YamlConfigSchema = remoteConfig.serviceConfig || {};
      if (localDevEnvs.includes(process.env.CS_SERVICEENV) && localConfig) {
        // 本地开发环境下
        const envArr = profilesActive.split(',');
        let envConfig = {};
        envArr.forEach((item) => {
          if (localDevEnvs.includes(item)) {
            envConfig = defaultsDeep(envConfig, serverConfig.application);
          } else {
            envConfig = defaultsDeep(
              localConfig[`profiles.${item}`],
              envConfig,
            );
          }
        });
        // 合并最终结果
        currentConfig = defaultsDeep(
          localConfig.application || {}, // 服务配置
          envConfig,
          appConfig, // 服务默认配置
          defaultConfig, // 系统包默认配置
        );
      } else {
        // 合并配置
        currentConfig = defaultsDeep(
          serverConfig.application, // 服务配置
          appConfig, // 服务默认配置
          defaultConfig, // 系统包默认配置
        );
      }
      // 处理覆盖配置的情况？？
      currentConfig = coverConfigFn(currentConfig, coverConfig);
      // logger.log(currentConfig);
    }
    convertType(currentConfig);
    // 转化配置注入到系统变量
    read2Env(currentConfig);
    logger.log('配置加载成功!');
    return currentConfig;
  } catch (e) {
    logger.error('Parse configuration exception:' + e);
    throw new Error(e);
  }
};

const coverConfigFn = (
  config: ConfigSchema,
  coverConfig: CoverConfig,
): ConfigSchema => {
  for (const key in config) {
    // 覆盖cover的配置
    switch (key) {
      case 'mysql':
        // 强制覆盖指定的配置
        for (const ikey in config[key]) {
          config[key][ikey] = defaultsDeep(
            {},
            coverConfig[key],
            config[key][ikey],
          );
        }
        break;
      default:
        break;
    }
    // 删除profiles的配置
    if (key.indexOf('profiles.') > -1) {
      delete config[key];
    }
  }
  return config;
};

const readLocalFile = (filePath: string): YamlConfigSchema => {
  filePath = resolve(process.cwd(), filePath);
  if (existsSync(filePath)) {
    return load(readFileSync(filePath, 'utf8')) as YamlConfigSchema;
  }
};

const convertType = (config: ConfigSchema): void => {
  for (const key in config) {
    if (typeof config[key] === 'number') {
      config[key] = Number(config[key]);
    }
    if (typeof config[key] === 'boolean') {
      config[key] = Boolean(config[key]);
    }
  }
};

const read2Env = (config: ConfigSchema): void => {
  //将envConfig成员配置读取到env中；
  for (const key in defaultEnvConfig) {
    if (Object.prototype.hasOwnProperty.call(defaultEnvConfig, key)) {
      if (typeof defaultEnvConfig[key] === 'object') {
        for (const ikey in defaultEnvConfig[key]) {
          const objectConfig = config[key] || defaultEnvConfig[key];
          process.env[`CS_${key.toUpperCase()}_${ikey.toUpperCase()}`] =
            objectConfig[ikey];
        }
      } else {
        process.env[`CS_${key.toUpperCase()}`] =
          config[key] || defaultEnvConfig[key];
      }
    }
  }
};

```


> 代码路径  `src\config.service.ts`

```typescript
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CONFIG_OPTIONS } from './config/constants';
import { ConfigSchema } from './config/config.schema.interface';
@Injectable()
export class ConfigService {
  private config: ConfigSchema;
  constructor(@Optional() @Inject(CONFIG_OPTIONS) options: ConfigSchema) {
    this.config = options;
  }
  get(key: string): any {
    const option = this.config[key];
    return option;
  }

  isConfig(key: string): boolean {
    return !!this.config[key];
  }

  getAll(): ConfigSchema {
    return this.config;
  }
}

```


> 代码路径  `src\config.utlis.ts`

```typescript
/* eslint-disable prefer-spread */
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import * as os from 'os';
import axios from 'axios';
import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import { NacosConfig } from './nacos.config';
import { resloveConfig } from './config.reslove';
import {
  ConfigSchema,
  ConfigOptions,
  ConfigFrom,
} from './config/config.schema.interface';
import { NACOS_NAME, NACOS_NAMESPACE, NACOS_PASSWORD } from './nacos.constants';

const logger = new Logger('ConfigInitialize');
type ConfigFromStrategy = () => Promise<any>;

export const getRemoteConfig = async function (
  configOption: ConfigOptions,
  strategyType: ConfigFrom = 'nacos',
): Promise<ConfigSchema> {
  const configStrategy = configStrategies[strategyType];
  if (configStrategy) {
    const remoteConfig = await configStrategy();
    if (remoteConfig) {
      // 合并写入环境
      if (!configOption.configFilePath) {
        configOption.configFilePath = `./dist/config.yaml`;
      }
      return resloveConfig(configOption, remoteConfig);
    } else {
      logger.error('远程配置获取为null,请检查配置是否正常！');
    }
  } else {
    logger.log('不支持当前类型的配置方式！');
  }
};

let counter = 0;
/**
 * 从服务器地址字符串中轮询选择一个IP地址
 * @param serverAddr
 * @returns 选中的IP地址字符串
 */
function selectServerAddress(serverAddr: string): string {
  if (!serverAddr) {
    throw new Error('serverAddr cannot be empty');
  }

  const ipList = serverAddr
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip);

  if (ipList.length === 0) {
    throw new Error('No valid IP addresses found');
  }

  const selectedIP = ipList[counter % ipList.length];
  counter = (counter + 1) % ipList.length;

  return selectedIP;
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryableError = (error: any): boolean => {
  // 检查网络相关错误代码
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNRESET'
  ) {
    return true;
  }

  // 检查HTTP响应状态码
  if (error.response && error.response.status >= 500) {
    return true;
  }

  // 检查超时错误类型
  if (
    error.name === 'ResponseTimeoutError' ||
    error.message?.includes('no response') ||
    error.message?.includes('timeout')
  ) {
    return true;
  }

  return false;
};

const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000,
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(
        `Nacos配置获取失败，进行第${attempt + 1}次重试 (${attempt + 1}/${maxRetries}): ${error.message}`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
};

const customLogger = () => {
  const logger = new Logger('NACOS Logger');
  return {
    ...console,
    info: (...args: any[]) => {
      logger.verbose.apply(logger, args);
    },
    error: (...args: any[]) => {
      logger.error.apply(logger, args);
    },
    warn: (...args: any[]) => {
      logger.warn.apply(logger, args);
    },
    debug: (...args: any[]) => {
      logger.debug.apply(logger, args);
    },
    verbose: (...args: any[]) => {
      logger.verbose.apply(logger, args);
    },
  };
};

const fromNacosStrategy: ConfigFromStrategy = async (): Promise<any> => {
  try {
    let config = null;
    const packagePath = resolve(process.cwd(), './package.json');
    const serviceName = JSON.parse(readFileSync(packagePath).toString()).name;

    // 从环境变量获取nacos配置,如果没有则使用默认值
    const nacosName = process.env.CS_NACOSNAME || NACOS_NAME;
    const nacosPassword = process.env.CS_NACOSPASSWORD || NACOS_PASSWORD;
    const namespace = process.env.CS_SERVICEENV || NACOS_NAMESPACE;
    const serverAddr = process.env.CS_NACOSSERVERIP;

    // 同步环境变量
    process.env.CS_NACOSNAME = nacosName;
    process.env.CS_NACOSPASSWORD = nacosPassword;

    if (serviceName) {
      config = await withRetry(async () => {
        const selectedServer = selectServerAddress(serverAddr);
        const nacosConfigClient = new NacosConfig({
          logger: customLogger(),
          serverAddr: selectedServer, // 域名
          namespace: namespace, //从环境中获取配置
          username: nacosName,
          password: nacosPassword,
          requestTimeout: 6000, // 增加超时时间到6秒
        });

        // 顺序获取配置，确保重试日志清晰
        const serviceConfig = await nacosConfigClient.getNacosConfig(
          serviceName,
          'DEFAULT_GROUP',
        );
        const application = await nacosConfigClient.getNacosConfig(
          '.application',
          'DEFAULT_GROUP',
        );
        const applicationCover = await nacosConfigClient.getNacosConfig(
          '.application-cover',
          'DEFAULT_GROUP',
        );

        return {
          application: load(application),
          applicationCover: load(applicationCover),
          serviceConfig: load(serviceConfig),
        };
      });
    } else {
      throw new HttpException(
        '未获取到serviceName',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return config;
  } catch (error) {
    logger.error(`获取配置异常: ${error.message}`);
    throw error;
  }
};

const fromGiteaStrategy: ConfigFromStrategy = async (): Promise<any> => {
  try {
    const packagePath = resolve(process.cwd(), './package.json');
    const serviceName = JSON.parse(readFileSync(packagePath).toString()).name;
    const mac = getMac();
    let env = 'dev';
    if (process.env.CS_SERVICEENV) {
      env = process.env.CS_SERVICEENV;
    }
    const result = await axios.get(
      `giteaServer/getServiceConfig?path=${serviceName}.yaml&flag=${mac}&env=${env}`,
      {
        baseURL: 'http://gitea.files:8090',
      },
    );
    if (result.data && result.data.status === 'success') {
      const config = {
        application: result.data.result['application.yaml'],
        applicationCover: result.data.result['application-cover.yaml'],
        serviceConfig: result.data.result[`${serviceName}.yaml`],
      };
      return config;
    } else {
      throw new HttpException(
        '获取远程配置失败！',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  } catch (error) {
    throw new HttpException('获取配置异常！', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

const configStrategies: { [key: string]: ConfigFromStrategy } = {
  gitea: fromGiteaStrategy,
  nacos: fromNacosStrategy,
};

export const getMac = (): string => {
  const interfaces = os.networkInterfaces();
  for (const dev in interfaces) {
    const iface = interfaces[dev];
    if (!iface) continue;

    for (let index = 0; index < iface.length; index++) {
      const alias = iface[index];
      if (
        alias.family === 'IPv4' &&
        alias.mac &&
        alias.mac !== '00:00:00:00:00:00'
      ) {
        return alias.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
};

```


> 代码路径  `src\index.ts`

```typescript
export * from './config.module';
export * from './config.service';
export * from './config/config.schema.interface';
export * from './config.utlis';
export * from './nacos.constants';

```


> 代码路径  `src\nacos.config.ts`

```typescript
import { NacosConfigClient } from 'nacos';
import { Logger, LoggerService } from '@nestjs/common';

export interface NacosOptions {
  logger?: any;
  serverAddr: string; // 域名
  namespace: string; //从环境中获取配置
  username: string;
  password: string;
  requestTimeout: number;
}

export class NacosConfig {
  private config: NacosOptions;
  private configClient!: NacosConfigClient;
  private logger: LoggerService;
  constructor(nacosOptions: NacosOptions) {
    this.config = nacosOptions;
    this.logger = new Logger('ConfigInitialize');
    this.initConfig();
  }

  // 获取环境配
  initConfig = () => {
    // 将自定义logger传递给NacosConfigClient
    const clientConfig: any = { ...this.config };
    if (this.config.logger) {
      clientConfig.logger = this.config.logger;
    }
    this.configClient = new NacosConfigClient(clientConfig);
    // 监听并处理错误事件，避免直接输出到控制台
    // this.configClient.on('error', (error: any) => {
    // this.logger.warn('nacos异常：', error.message);
    // });
  };

  // 根据dataID获取配置
  getNacosConfig = async (
    dataId: string,
    groupId: string,
    options?: any,
  ): Promise<any> => {
    let config = null;
    if (dataId && groupId) {
      config = await this.configClient.getConfig(dataId, groupId, options);
    } else {
      this.logger.warn('获取nacos配置参数信息缺失！');
    }
    return config;
  };
  // 监听配置
  subscribeNacosConfig = async (
    dataId: string,
    groupId: string,
    callFn: Promise<void>,
  ) => {
    this.configClient.subscribe(
      {
        dataId,
        groupId,
      },
      callFn,
    );
    this.logger.log('nacos配置服务启用监听！');
  };

  close = async () => {
    if (this.configClient) {
      await this.configClient.close();
      this.logger.log('Nacos config client closed.');
    }
  };
}

```


> 代码路径  `src\nacos.constants.ts`

```typescript
// NACOS账号
export const NACOS_NAME = 'nacos';
// NACOS密码
export const NACOS_PASSWORD = 'nacos';
// NACOS默认环境
export const NACOS_NAMESPACE = 'dev';

```


> 代码路径  `src\config\config.default.ts`

```typescript
export const defaultConfig = {};

```


> 代码路径  `src\config\config.env.ts`

```typescript
import { EnvConfig } from './config.schema.interface';
import { CommonUtil } from '@cs/nest-common';

export const defaultEnvConfig: EnvConfig = {
  host: CommonUtil.getIPAdress(),
  port: 8080,
  name: 'nest-app-server',
  serverPath: '',
  env: 'dev',
  docs: {
    name: '',
    describe: '',
    version: 0,
  },
};

```


> 代码路径  `src\config\config.schema.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export type ConfigFrom = 'gitea' | 'nacos';
export interface ConfigOptions {
  configFilePath?: string; // 本地配置地址
  configFrom?: ConfigFrom;
  onlyLocal?: boolean;
}

export interface ConfigAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => ConfigSchema | Promise<ConfigSchema>;
  inject?: any[];
}
export interface ConfigSchema {
  name: string;
  port: number;
  serverPath: string;
  env?: string;
  docs?: Documnet;
  'profiles.active'?: string;
  [key: string]: any;
}

export interface YamlConfigSchema {
  application: ConfigSchema;
}

// 文档配置
interface Documnet {
  name: string;
  describe: string;
  version: number;
}

// mysql配置
interface Mysql {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  timeout: number;
  logging: boolean;
}

export interface EnvConfig {
  host: string;
  port: number;
  name: string;
  serverPath: string;
  env: string;
  docs: Documnet;
}

export interface CoverConfig {
  env: string;
  mysql: Mysql;
}

```


> 代码路径  `src\config\constants.ts`

```typescript
export const CONFIG_OPTIONS = 'CONFIG_OPTIONS';

```


#### 代码说明

# @cs/nest-config
 一个功能强大且灵活的 NestJS 配置管理模块，支持本地配置文件、远程配置中心（Nacos/Gitea）、环境变量配置以及配置的动态合并与覆盖。  

## 特性
+ ✨ 支持多种配置源：本地配置文件 (YAML/JSON)、Nacos 远程配置、Gitea
+ 🔥 完全类型安全的配置访问
+ 🚀 支持模块化和全局配置
+ 📦 深度集成 NestJS 依赖注入系统
+ ⚡ 支持配置热监听（Nacos）
+ 🛡️ 内置配置验证和错误处理
+ 🔄 支持异步配置初始化

## 安装
```bash
npm install @cs/nest-config
# 或
yarn add @cs/nest-config
# 或
pnpm add @cs/nest-config
```

## 快速开始


> configModule在装饰器`CSModule`中默认全局注入到服务中。使用时直接引入`configService`直接使用即可。不需要单独注册 该模块
>

### 基础用法
```typescript
import { ConfigModule, ConfigService } from '@cs/nest-config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFilePath: './config.yaml', // 本地配置文件路径
      onlyLocal: true, // 仅使用本地配置
    }),
  ],
})
export class AppModule {}

// 注入并使用配置服务
@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getDatabaseConfig() {
    const dbConfig = this.configService.get('mysql');
    return dbConfig;
  }

  checkConfig() {
    if (this.configService.isConfig('redis')) {
      // 检查配置存在
    }
  }

  getAllConfig() {
    // 获取所有配置
    const all = this.configService.getAll()
  }
}
```

### 使用 Nacos 远程配置
```typescript
import { ConfigModule } from '@cs/nest-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFrom: 'nacos',
      configFilePath: './config.yaml', // 本地配置作为备选
    }),
  ],
})
export class AppModule {}
```

### 异步配置初始化
```typescript
@Module({
  imports: [
    ConfigModule.forRootAsync({
      imports: [SomeModule],
      useFactory: async (someService: SomeService) => {
        const config = await someService.getConfig();
        return config;
      },
      inject: [SomeService],
    }),
  ],
})
export class AppModule {}
```

### 配置文件示例
```yaml
application:
  name: my-app
  port: 3000
  serverPath: /api
  env: dev
  docs:
    name: API Documentation
    describe: My App API
    version: 1
  logger:
    level: debug
    errorLogName: error.log
```

## API 参考
### ConfigModule
#### `forRoot(options: ConfigOptions, isGlobal = true)`
同步初始化配置模块。

参数：

+ `options`: 配置选项
    - `configFilePath`: 本地配置文件路径
    - `configFrom`: 配置源（'gitea' | 'nacos'）
    - `onlyLocal`: 是否仅使用本地配置
+ `isGlobal`: 是否为全局模块（默认 true）

#### `forRootAsync(options: ConfigAsyncOptions, isGlobal = true)`
异步初始化配置模块。

参数：

+ `options`: 异步配置选项
    - `imports`: 导入的模块
    - `useFactory`: 配置工厂函数
    - `inject`: 注入的依赖
+ `isGlobal`: 是否为全局模块（默认 true）

### ConfigService
#### `get(key: string): any`
获取指定键的配置值。

```typescript
const port = configService.get('port');
const mysqlConfig = configService.get('mysql.default');
```

#### `isConfig(key: string): boolean`
检查指定键的配置是否存在。

```typescript
if (configService.isConfig('redis')) {
  // Redis 配置存在
}
```

#### `getAll(): ConfigSchema`
获取所有配置。

```typescript
const allConfig = configService.getAll();
```



## 环境变量配置
使用该模块使用nacos作为配置源管理需要配置以下环境变量：

```plain
#环境变量描述默认值
CS_SERVICE #服务环境
CS_NACOSNAME #用户名
CS_NACOSPASSWORD #密码
CS_NACOSSERVERIP #服务器地址:端口号-支持多个地址逗号分隔
```

配置加载后，部分指定配置会自动将配置值注入到以 `CS_` 前缀的环境变量中：

```bash

CS_HOST=localhost
CS_PORT=3000
```

## 使用场景
### 1. 仅本地配置
适用于开发环境或不需要远程配置的场景：

```typescript

ConfigModule.forRoot({
  configFilePath: './config.yaml',
  onlyLocal: true
})
```

### 2. Nacos 配置中心
适用于微服务架构，使用 Nacos 作为配置中心：

```typescript

// 设置环境变量
process.env.CS_NACOSSERVERIP = '192.168.1.100:8848,192.168.1.101:8848';
process.env.CS_SERVICEENV = 'dev';

ConfigModule.forRoot({
  configFrom: 'nacos',
  onlyLocal: false
})
```

## 配置合并策略
配置模块使用 lodash 的 `defaultsDeep` 进行深度合并，优先级如下（从高到低）：

1. **本地应用配置** (`application` 部分)
2. **环境特定配置** (`profiles.{env}` 部分)（优先级从左到右依次升高）
3. **远程应用配置** (从配置中心获取)
4. **系统默认配置** (内置默认值)

### 本地开发环境合并规则
在本地开发环境（`dev`、`beta`、`dev-mc`）下：

```plain
yaml

# 最终配置 = 本地应用配置 + 环境配置 + 远程配置 + 默认配置
```

### 生产环境合并规则
在生产环境下：

```plain
yaml

# 最终配置 = 远程服务配置 + 远程应用配置 + 默认配置
```

## 注意事项
```yaml
  # 应用环境变量(本地开发环境多套配置) 优先级从左到右依次升高，注意 本地环境application下的配置优先级最高
  profiles.active: 'dev,local'

 
#当本地有多套配置时采用profiles.[配置标识]进行分组， 由profiles.active配置加载顺序(本地开发环境配置)
profiles.local: 
   logger:
    level: 'info' # 日志级别 info, error, warn, debug, verbose
    timestamp: true # 是否开启时间戳
    disableConsoleAtProd: false # 是否在生产环境禁用控制台日志
    maxFileSize: '2m' # 单个日志文件最大大小

```



## 配置模板


### 本地开发配置模板


```yaml
application:  
  name: 'node-database-service'  
  port: 3023  # 部署环境中不需要配置
  serverPath: 'ormServer'
  profiles.active: 'local1,local'  # 应用环境变量(本地开发环境多套配置) 优先级从左到右依次升高，但本地文件配置都要优先级高于远程环境配置，注意 本地环境application下的配置优先级最高发环境中应用的那套配置（本地环境下可以有多套配置）
profiles.local: # local配置
  logger: 
    level: 'debug'
  docs: 
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true
profiles.local1: # local1配置
  logger: 
    level: 'debug'
  docs: 
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true

```

### 部署环境中配置模板
```yaml
application:  
  name: 'node-database-service'
  serverPath: 'ormServer'
  logger:
    level: 'debug'
  docs: 
    name: 'orm方法测试服务'
    describe: 'orm方法测试服务'
    version: 1.4
  exceptionFilter:
    stack:
      response: true
      logger: true
```


