### @cs/nest-cloud代码库源码整理

#### 代码目录
```
@cs/nest-cloud/
├── src/
├── components/
│   ├── decorator/
│   │   ├── index.ts
│   │   └── interceptor.decorator.ts
│   ├── filter/
│   │   └── exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── middleware/
│   │   ├── context.middleware.ts
│   │   └── proxy.middleware.ts
│   └── index.ts
├── rpc/
│   ├── json-rpc/
│   │   ├── client.ts
│   │   ├── rpc-error-transformer.ts
│   │   ├── rpc-helpers.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── index.ts
│   ├── rpc.client.ts
│   ├── rpc.controller.ts
│   ├── rpc.decorators.ts
│   ├── rpc.errors.ts
│   ├── rpc.interface.ts
│   ├── rpc.module.ts
│   └── rpc.registry.ts
├── setup/
│   ├── bodyParser.setup.ts
│   ├── filter.setup.ts
│   ├── index.ts
│   ├── interceptors.setup.ts
│   ├── logger.setup.ts
│   ├── middleware.setup.ts
│   ├── pipes.setup.ts
│   ├── setup.interface.ts
│   ├── started.setup.ts
│   └── swagger.setup.ts
├── app.bootstrap.ts
├── base.mtadata.ts
├── index.ts
└── nacos.naming.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-cloud",
  "version": "2.0.1",
  "description": "服务启动 注册 跨服务相关包",
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
    "publish": "pnpm publish --no-git-checks" ,
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "axios": "^0.27.2",
    "body-parser": "^1.20.3",
    "cookie-parser": "^1.4.7",
    "nacos": "^2.6.0",
    "http-proxy-middleware": "^3.0.3"
  },
  "devDependencies": {
    "@types/http-proxy-middleware": "^1.0.0"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    }
  }
}

```


> 代码路径  `src\app.bootstrap.ts`

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@cs/nest-config';
import { LoggerService } from '@cs/nest-common';
import { configStrategyMap } from './setup';

type AsyncFunction = (app: any, config: ConfigService) => Promise<any>;

export async function bootstrap(
  rootModule: any, // 加载根模块
  appStartedCall?: AsyncFunction, // 启动中间回调
) {
  // 初始化应用对象
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    bufferLogs: true,
  });

  // 获取配置 根据配置加载对象
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  // 根据配置策略启动相关设置
  for (const key of Object.keys(configStrategyMap)) {
    const strategy = new configStrategyMap[key](app, configService);
    await strategy.execute();
  }

  // 启动回调函数
  if (appStartedCall) {
    await appStartedCall(app, configService);
  }

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('捕获到未处理的Promise Rejection!', { reason, promise });
    // logger.error('程序因 unhandledRejection 即将退出...');
    // process.exit(1);
  });

  process.on('uncaughtException', (err, origin) => {
    logger.error('捕获到未处理的同步异常!', { err, origin });
    // logger.error('程序因 uncaughtException 即将退出...');
    // process.exit(1);
  });
}

```


> 代码路径  `src\base.mtadata.ts`

```typescript
import { Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigOptions } from '@cs/nest-config';
import { LoggerModule, ContextModule } from '@cs/nest-common';
import { RpcModule } from './rpc/rpc.module';
export function CSModule(
  sharedMetaData: ModuleMetadata,
  configOption?: ConfigOptions,
): ClassDecorator {
  // 先通过获取配置 之后选择性加载相关模块
  const metadata: ModuleMetadata = {
    imports: [
      ConfigModule.forRoot(
        Object.assign(
          {
            configFilePath: './dist/config.yaml',
            onlyLocal: false,
            configFrom: 'nacos',
          },
          configOption || {},
        ),
        true,
      ),
      ContextModule.forRoot({
        enableCaching: true,
        cacheTTL: -1,
      }),
      LoggerModule.forRootAsync(
        {
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            return {
              ...config.get('logger'),
            };
          },
        },
        true,
      ),
      RpcModule.forRootAsync(
        {
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            return {
              ...config.get('rpc'),
            };
          },
        },
        true,
      ),
    ],
    providers: [],
    controllers: [],
    exports: [LoggerModule, RpcModule, ConfigModule, ContextModule],
  };

  for (const key in sharedMetaData) {
    metadata[key].push(...sharedMetaData[key]);
  }
  // 调用原始 @Module 装饰器，并返回其结果
  return Module(metadata);
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './base.mtadata';
export * from './app.bootstrap';
export * from './components';
export * from './rpc';

```


> 代码路径  `src\nacos.naming.ts`

```typescript
/* eslint-disable prefer-spread */
import { NacosNamingClient, NacosNamingClientConfig, Host } from 'nacos';
import { Logger, LoggerService } from '@nestjs/common';
import { CommonUtil } from '@cs/nest-common';
// import { resolve } from 'path';
// import { readFileSync } from 'fs';

interface Instance {
  instanceId: string;
  ip: string; //IP of instance
  port: number; //Port of instance
  healthy: boolean;
  enabled: boolean;
  serviceName?: string;
  weight?: number;
  ephemeral?: boolean;
  clusterName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SubscribeInfo {
  serviceName: string;
  groupName?: string;
  clusters?: string;
}

export class NacosNaming {
  private static instance: NacosNaming;
  private config: NacosNamingClientConfig;
  private namingClient: NacosNamingClient;
  private logger: LoggerService;
  constructor(nacosOptions: NacosNamingClientConfig) {
    this.config = nacosOptions;
    this.logger = new Logger('NamingRegisting');
    this.initConfig();
  }

  // 获取环境配
  initConfig = () => {
    this.namingClient = new NacosNamingClient(this.config);
  };

  public static getInstance(config: NacosNamingClientConfig): NacosNaming {
    if (!NacosNaming.instance) {
      NacosNaming.instance = new NacosNaming(config);
    }
    return NacosNaming.instance;
  }

  ready = async () => {
    await this.namingClient.ready();
  };

  // 注册服务实例
  registerInstance = async (
    serviceName: string,
    instance: Instance,
    groupName?: string,
  ): Promise<void> => {
    if (!groupName) groupName = 'DEFAULT_GROUP';
    if (serviceName) {
      await this.namingClient.registerInstance(
        serviceName,
        instance,
        groupName,
      );
      this.logger.log(`服务 ${serviceName} 在注册中心成功注册!`);
    } else {
      this.logger.error('The service name cannot be empty!');
    }
  };

  // 获取健康实例
  selectOneHealthyInstance = async (
    serviceName: string,
    groupName?: string,
    clusters?: string,
  ): Promise<Host | undefined> => {
    await this.ready(); //待客户端预备好后
    const instances = await this.namingClient.selectInstances(
      serviceName,
      groupName,
      clusters,
      true,
      true,
    );
    let totalWeight = 0;
    for (const instance of instances) {
      totalWeight += instance.weight;
    }
    let pos = Math.random() * totalWeight;
    for (const instance of instances) {
      if (instance.weight) {
        pos -= instance.weight;
        if (pos <= 0) {
          return instance as Host;
        }
      }
    }
  };
}

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

export const customLogger = () => {
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

// 实例注册
export const registerService = async () => {
  const nacosName = process.env.CS_NACOSNAME;
  const nacosPassword = process.env.CS_NACOSPASSWORD;
  const namespace = process.env.CS_SERVICEENV;
  const nacosServerIp = process.env.CS_NACOSSERVERIP;

  const nacosNamingClient = NacosNaming.getInstance({
    logger: customLogger(),
    serverList: selectServerAddress(nacosServerIp), // 域名
    namespace: namespace, //从环境中获取配置
    username: nacosName,
    password: nacosPassword,
  });

  // 注册实例
  await nacosNamingClient.ready();

  // 准备实例参数
  const instance: Instance = {
    serviceName: process.env.CS_NAME,
    weight: 1,
    enabled: true,
    healthy: true,
    port: Number(process.env.CS_PORT),
    ip: process.env.CS_HOST,
    instanceId: CommonUtil.idGenerate(),
  };
  await nacosNamingClient.registerInstance(instance.serviceName, instance);
};

```


> 代码路径  `src\components\index.ts`

```typescript
export * from './filter/exception.filter';
export * from './interceptors/logging.interceptor';
export * from './interceptors/transform.interceptor';
export * from './middleware/context.middleware';
export * from './decorator/index';

```


> 代码路径  `src\rpc\index.ts`

```typescript
export * from './rpc.interface';
export * from './rpc.module';
export * from './rpc.controller';
export * from './rpc.decorators';
export * from './rpc.registry';
export * from './rpc.client';
export * from './rpc.errors';
export * from './json-rpc/types';
export * from './json-rpc/rpc-helpers';

```


> 代码路径  `src\rpc\rpc.client.ts`

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ContextService, CONTEXT_HEADER } from '@cs/nest-common';
import { AxiosRequestConfig } from 'axios';
import { Host } from 'nacos';
import { RPC_MODULE_OPTIONS, RpcConfig } from './rpc.interface';
import { JsonRpcClient } from './json-rpc/client';
import { JsonRpcResponse } from './json-rpc/types';
import { RpcModuleOptions, RpcRequestClient } from './rpc.interface';
import { RpcInternalException, RpcException } from './rpc.errors';
import { NacosNaming, customLogger } from '../nacos.naming';
import { getRPCResult } from './json-rpc/rpc-helpers';
@Injectable()
export class RpcClient {
  private client: JsonRpcClient;
  private nacosNaming: NacosNaming;
  private readonly logger = new Logger('RpcService');
  constructor(
    @Inject(RPC_MODULE_OPTIONS)
    private readonly options: RpcModuleOptions,
    private readonly contextService: ContextService,
  ) {
    this.client = new JsonRpcClient({
      protocol: options.protocol,
      timeout: options.timeout || 60000,
    });

    // 获取nacos实例
    this.nacosNaming = this.initNacosNaming();
  }
  async call<TParams, TResult>(
    request: RpcRequestClient<TParams>,
  ): Promise<JsonRpcResponse<TResult>> {
    const { rpcConfig, payload, reqOptions = {} } = request;

    // 获取并传递上下文
    const finalreqOptions = this.initContext(reqOptions);
    const instance = await this.getHealthyInstance(rpcConfig);
    let url = `${this.options.protocol}://${instance.ip}:${instance.port}`;
    if (rpcConfig.servicePath) {
      url += `/${rpcConfig.servicePath}/rpc`;
    } else {
      url += '/rpc';
    }
    try {
      return this.client.call<TParams, TResult>(
        {
          url,
          req: payload,
        },
        finalreqOptions,
      );
    } catch (error) {
      // 已经是 RpcException 的错误直接抛出
      if (error instanceof RpcException) {
        throw error;
      }
      // 其他错误转换为内部错误
      throw new RpcInternalException('Failed to call RPC service', {
        originalError: error.message,
        stack: error.stack,
      });
    }
  }

  async callWithExtract<TParams, TResult>(
    request: RpcRequestClient<TParams>,
    options = {
      isHttpError: true,
      throwOnError: true,
    },
  ): Promise<TResult> {
    const result = await this.call(request);
    // 如果是通知类请求，则直接返回
    if (request.payload.isNotify) {
      return;
    }
    return getRPCResult<TResult>(result, options);
  }

  // 函数重载签名
  async getNewId(): Promise<string>;
  async getNewId(number: number): Promise<string[]>;

  // 函数实现
  async getNewId(number?: number): Promise<string | string[]> {
    // 调用idGenerationServer服务，获取新ID
    const response = await this.call({
      rpcConfig: {
        serviceName: 'node-pf-id-generation-service',
        servicePath: 'idGenerationServer',
      },
      payload: {
        method: 'id.batchCreateId',
        params: number || 1, // 如果没有传参数，默认为1
      },
    });

    const result = getRPCResult<string | string[]>(response, {
      isHttpError: false,
    });

    // 根据是否传入参数来决定返回类型
    if (number === undefined) {
      // 没有传入参数，返回单个字符串
      return Array.isArray(result) ? result[0] : result;
    } else {
      // 传入了参数，返回数组
      return Array.isArray(result) ? result : [result];
    }
  }

  private initContext(reqOptions: AxiosRequestConfig) {
    const allContext = this.contextService.getAllContext();
    if (!reqOptions.headers) {
      reqOptions.headers = {};
    }
    const encodedContext = this.contextService.encodeContext(allContext);
    reqOptions.headers[CONTEXT_HEADER] = encodedContext;
    // 添加请求跟踪ID，便于排查问题
    const trackingId = this.contextService.getContext<string>('trackingId');
    if (trackingId) {
      reqOptions.headers['x-tracking-id'] = trackingId;
    }
    return reqOptions;
  }

  private initNacosNaming(): NacosNaming {
    // 实例化nacosNaming
    const nacosName = process.env.CS_NACOSNAME;
    const nacosPassword = process.env.CS_NACOSPASSWORD;
    const namespace = process.env.CS_SERVICEENV;
    const nacosServerIp = process.env.CS_NACOSSERVERIP;
    return NacosNaming.getInstance({
      logger: customLogger(),
      serverList: nacosServerIp, // 域名
      namespace: namespace, //从环境中获取配置
      username: nacosName,
      password: nacosPassword,
    });
  }

  private async getHealthyInstance(config: RpcConfig): Promise<Host> {
    try {
      const instance = await this.nacosNaming.selectOneHealthyInstance(
        config.serviceName,
        config.groupName,
        config.clusters,
      );

      if (!instance) {
        throw new Error(
          `No healthy instance found for service: ${config.serviceName}`,
        );
      }
      return instance;
    } catch (error) {
      throw new Error(`Failed to get healthy instance: ${error.message}`);
    }
  }
}

```


> 代码路径  `src\rpc\rpc.controller.ts`

```typescript
import { Controller, Post, Body, Req, Get, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { skipTransformInterceptor } from '../components/decorator/interceptor.decorator';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { RpcRegistry, RpcParameterInfo, RpcMethodInfo } from './rpc.registry';
import { JsonRpcRequest, JsonRpcResponse } from './json-rpc/types';
import { createJsonRpcSuccess, validateJsonRpcRequest } from './json-rpc/utils';
import { RpcServiceInfo } from './rpc.registry';
import { RpcInvalidParamsException } from './rpc.errors';

class JsonRpcRequestDto {
  @ApiProperty({
    description: 'JSON-RPC版本号',
    example: '2.0',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  jsonrpc: string;

  @ApiProperty({
    description: 'RPC方法名,<路径>.<方法>',
    example: 'service.method',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({
    description: '请求参数',
    example: { param1: 'value1', param2: 'value2' },
    required: false,
    type: Object,
  })
  @IsObject()
  @IsOptional()
  params?: any;

  @ApiProperty({
    description: '请求ID',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  id?: string | number | null;
}

// 定义响应DTO类
class JsonRpcResponseDto {
  @ApiProperty({
    description: 'JSON-RPC版本号',
    example: '2.0',
  })
  jsonrpc: string;

  @ApiProperty({
    description: '响应结果',
    example: { data: 'success' },
  })
  result?: any;

  @ApiProperty({
    description: '错误信息',
    example: {
      code: -32600,
      message: 'Invalid Request',
      data: { details: 'Invalid method parameter' },
    },
  })
  error?: {
    code: number;
    message: string;
    data?: any;
  };

  @ApiProperty({
    description: '请求ID',
    example: '1234567890',
  })
  id: string | number | null;
}

@Controller('rpc')
@ApiTags('rpc')
export class RpcController {
  constructor(private readonly rpcRegistry: RpcRegistry) {}

  @Post()
  @ApiOperation({
    summary: 'RPC 请求控制器',
    description:
      '处理JSON-RPC 2.0请求,支持方法调用和通知(使用postman等工具调试时，注意请求头部添加x-rpc-request: true标识头)',
  })
  @ApiBody({
    type: JsonRpcRequestDto,
    description: 'JSON-RPC 2.0请求对象',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回RPC响应',
    type: JsonRpcResponseDto,
  })
  async handleRpcRequest(
    @Body()
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse | void> {
    // if (Array.isArray(request)) {
    //   return Promise.all(request.map((req) => this.handleSingleRequest(req)));
    // }
    // 请求参数验证
    validateJsonRpcRequest(request);
    return await this.handleSingleRequest(request);
  }

  private async handleSingleRequest(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const { method, params, id } = request;
    if (!method || typeof method !== 'string') {
      throw new RpcInvalidParamsException('Invalid method name');
    }
    const result = await this.rpcRegistry.executeMethod(method, params);
    return createJsonRpcSuccess(id, result);
  }

  @Get()
  @ApiOperation({
    summary: 'RPC服务文档信息',
    description: '获取已注册的RPC服务信息，查询测试使用',
  })
  getServicesInfo(): RpcServiceInfo[] {
    const services = this.rpcRegistry.getServicesInfo();

    // 这有助于调试
    // console.log('Services info:', JSON.stringify(services, null, 2));

    return services;
  }

  @Get('docs')
  @skipTransformInterceptor()
  @ApiOperation({
    summary: 'RPC服务可视化文档',
    description: '以HTML页面形式展示RPC服务文档，支持在线测试',
  })
  getDocsPage(@Res() res: Response): void {
    if (process.env.CS_DOCS_NAME) {
      const services = this.rpcRegistry.getServicesInfo();

      // 获取服务路径配置，构建正确的RPC调用URL
      const serverPath = process.env.CS_SERVERPATH;
      const rpcEndpoint = serverPath ? `/${serverPath}/rpc` : '/rpc';

      const html = this.generateRpcDocsHTML(services, rpcEndpoint);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);
    } else {
      res.send('UNCONFIG!');
    }
  }

  private generateRpcDocsHTML(
    services: RpcServiceInfo[],
    rpcEndpoint: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${process.env.CS_DOCS_NAME}</title>
    <style>
        :root {
            --primary-color: #ff7f00;
            --primary-hover: #e66d00;
            --secondary-color: #2d3748;
            --success-color: #38a169;
            --error-color: #e53e3e;
            --warning-color: #d69e2e;
            --background: #f7fafc;
            --card-background: #ffffff;
            --border-color: #e2e8f0;
            --text-primary: #2d3748;
            --text-secondary: #718096;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--background);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: white;
            padding: 1rem 0;
            text-align: center;
            box-shadow: var(--shadow);
        }

        .header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .header p {
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
        }

        .service-card {
            background: var(--card-background);
            border-radius: 2px;
            margin-bottom: 1rem;
            box-shadow: var(--shadow);
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .service-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .service-header {
            background: var(--secondary-color);
            color: white;
            padding: 0.75rem 1rem;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .service-title {
            font-size: 1.1rem;
            font-weight: 600;
        }

        .service-description {
            color: #cbd5e0;
            margin-top: 0.25rem;
            font-size: 0.85rem;
        }

        .expand-icon {
            transition: transform 0.3s ease;
            font-size: 1.2rem;
        }

        .expand-icon.expanded {
            transform: rotate(180deg);
        }

        .methods-container {
            display: none;
            padding: 0.75rem;
        }

        .methods-container.expanded {
            display: block;
        }

        .method-card {
            border: 1px solid var(--border-color);
            border-radius: 2px;
            margin-bottom: 0.75rem;
            overflow: hidden;
        }

        .method-header {
            background: #f8f9fa;
            padding: 0.75rem;
            border-bottom: 1px solid var(--border-color);
        }

        .method-name {
            font-size: 1rem;
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 0.25rem;
        }

        .method-description {
            color: var(--text-secondary);
            font-size: 0.85rem;
        }

        .method-body {
            padding: 0.75rem;
        }

        .params-section, .test-section {
            margin-bottom: 0.75rem;
        }

        .section-title {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .param-item {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 2px;
            margin-bottom: 0.35rem;
            font-size: 0.85rem;
        }

        .param-name {
            font-weight: 600;
            color: var(--primary-color);
            min-width: 100px;
        }

        .param-required {
            background: var(--error-color);
            color: white;
            font-size: 0.65rem;
            padding: 0.15rem 0.4rem;
            border-radius: 2px;
            margin-left: 0.4rem;
        }

        .param-optional {
            background: var(--text-secondary);
            color: white;
            font-size: 0.65rem;
            padding: 0.15rem 0.4rem;
            border-radius: 2px;
            margin-left: 0.4rem;
        }

        .param-description {
            margin-left: 0.75rem;
            color: var(--text-secondary);
            flex: 1;
            font-size: 0.8rem;
        }

        .test-form {
            background: #f8f9fa;
            padding: 0.75rem;
            border-radius: 2px;
            border: 1px solid var(--border-color);
        }

        .form-group {
            margin-bottom: 0.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.35rem;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.85rem;
        }

        .form-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 2px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.85rem;
            resize: vertical;
            min-height: 80px;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(255, 127, 0, 0.1);
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 2px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.85rem;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-primary:disabled {
            background: var(--text-secondary);
            cursor: not-allowed;
            transform: none;
        }

        .response-container {
            margin-top: 0.5rem;
            border-radius: 2px;
            overflow: hidden;
        }

        .response-header {
            padding: 0.5rem 0.75rem;
            font-weight: 600;
            color: white;
            font-size: 0.85rem;
        }

        .response-success {
            background: var(--success-color);
        }

        .response-error {
            background: var(--error-color);
        }

        .response-body {
            background: #2d3748;
            color: #e2e8f0;
            padding: 0.5rem;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.75rem;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 300px;
            overflow-y: auto;
        }

        .loading {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
            margin-right: 0.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .no-services {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        .validation-error {
            color: var(--error-color);
            font-size: 0.8rem;
            margin-top: 0.25rem;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0.5rem;
            }

            .header h1 {
                font-size: 1.5rem;
            }

            .header p {
                font-size: 0.8rem;
            }

            .param-item {
                flex-direction: column;
                align-items: flex-start;
            }

            .param-description {
                margin-left: 0;
                margin-top: 0.25rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ${process.env.CS_DOCS_NAME}</h1>
        <p>${process.env.CS_DOCS_DESCRIBE}-${process.env.CS_DOCS_VERSION}</p>
    </div>

    <div class="container">
        ${
          services.length === 0
            ? '<div class="no-services"><h3>暂无可用的RPC服务</h3><p>请确保您的服务已正确注册RPC装饰器</p></div>'
            : services
                .map((service) => this.generateServiceCardHTML(service))
                .join('')
        }
    </div>

    <script>
        class RPCDocumentApp {
            constructor(rpcEndpoint) {
                this.rpcEndpoint = rpcEndpoint;
                this.initializeEventListeners();
            }

            initializeEventListeners() {
                // 服务展开/收起事件
                document.querySelectorAll('.service-header').forEach(header => {
                    header.addEventListener('click', (e) => {
                        const serviceCard = e.currentTarget.closest('.service-card');
                        const methodsContainer = serviceCard.querySelector('.methods-container');
                        const expandIcon = serviceCard.querySelector('.expand-icon');
                        
                        if (methodsContainer.classList.contains('expanded')) {
                            methodsContainer.classList.remove('expanded');
                            expandIcon.classList.remove('expanded');
                        } else {
                            methodsContainer.classList.add('expanded');
                            expandIcon.classList.add('expanded');
                        }
                    });
                });

                // RPC测试表单提交事件
                document.querySelectorAll('.test-form').forEach(form => {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.handleRPCTest(e.target);
                    });
                });

                // 参数输入验证事件
                document.querySelectorAll('.form-input').forEach(input => {
                    input.addEventListener('blur', (e) => {
                        this.validateJSON(e.target);
                    });
                });
            }

            validateJSON(input) {
                const errorElement = input.parentNode.querySelector('.validation-error');
                if (errorElement) {
                    errorElement.remove();
                }

                const value = input.value.trim();
                if (!value) return;

                try {
                    JSON.parse(value);
                    input.style.borderColor = 'var(--success-color)';
                } catch (error) {
                    input.style.borderColor = 'var(--error-color)';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'validation-error';
                    errorDiv.textContent = '无效的JSON格式: ' + error.message;
                    input.parentNode.appendChild(errorDiv);
                }
            }

            async handleRPCTest(form) {
                const formData = new FormData(form);
                const method = formData.get('method');
                const paramsInput = form.querySelector('.form-input');
                const submitBtn = form.querySelector('.btn-primary');
                const responseContainer = form.querySelector('.response-container');

                // 验证JSON格式
                let params = null;
                const paramsValue = paramsInput.value.trim();
                
                if (paramsValue) {
                    try {
                        params = JSON.parse(paramsValue);
                    } catch (error) {
                        this.showResponse(responseContainer, {
                            success: false,
                            data: { error: 'JSON格式错误: ' + error.message }
                        });
                        return;
                    }
                }

                // 构建RPC请求
                const rpcRequest = {
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: Date.now()
                };

                // 显示加载状态
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span>测试中...';

                try {
                    const response = await fetch(this.rpcEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-rpc-request': 'true'
                        },
                        body: JSON.stringify(rpcRequest)
                    });

                    const result = await response.json();
                    
                    this.showResponse(responseContainer, {
                        success: response.ok && !result.error,
                        data: result,
                        status: response.status
                    });

                } catch (error) {
                    this.showResponse(responseContainer, {
                        success: false,
                        data: { error: '网络请求失败: ' + error.message }
                    });
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '🚀 发送测试';
                }
            }

            showResponse(container, response) {
                const { success, data, status } = response;
                
                container.innerHTML = \`
                    <div class="response-header \${success ? 'response-success' : 'response-error'}">
                        \${success ? '✅ 调用成功' : '❌ 调用失败'} \${status ? '(HTTP ' + status + ')' : ''}
                    </div>
                    <div class="response-body">\${JSON.stringify(data, null, 2)}</div>
                \`;
                
                container.style.display = 'block';
            }
        }

        // 初始化应用，传入RPC端点配置
        document.addEventListener('DOMContentLoaded', () => {
            new RPCDocumentApp('${rpcEndpoint}');
        });
    </script>
</body>
</html>`;
  }

  private generateServiceCardHTML(service: RpcServiceInfo): string {
    return `
        <div class="service-card">
            <div class="service-header">
                <div>
                    <div class="service-title">${this.escapeHtml(service.name)}</div>
                    ${service.description ? `<div class="service-description">${this.escapeHtml(service.description)}</div>` : ''}
                </div>
                <div class="expand-icon">▼</div>
            </div>
            <div class="methods-container">
                ${service.methods.map((method) => this.generateMethodCardHTML(method)).join('')}
            </div>
        </div>`;
  }

  private generateMethodCardHTML(method: RpcMethodInfo): string {
    return `
        <div class="method-card">
            <div class="method-header">
                <div class="method-name">${this.escapeHtml(method.fullName)}</div>
                ${method.description ? `<div class="method-description">${this.escapeHtml(method.description)}</div>` : ''}
            </div>
            <div class="method-body">
                ${
                  method.parameters.length > 0
                    ? `
                    <div class="params-section">
                        <div class="section-title">📋 参数列表</div>
                        ${method.parameters
                          .map(
                            (param) => `
                            <div class="param-item">
                                <span class="param-name">${this.escapeHtml(param.name)}</span>
                                <span class="${param.required ? 'param-required' : 'param-optional'}">
                                    ${param.required ? 'Required' : 'Optional'}
                                </span>
                                ${param.type ? `<span class="param-type">[${this.escapeHtml(param.type)}]</span>` : ''}
                                ${param.description ? `<span class="param-description">${this.escapeHtml(param.description)}</span>` : ''}
                            </div>
                        `,
                          )
                          .join('')}
                    </div>
                `
                    : ''
                }
                
                <div class="test-section">
                    <div class="section-title">🧪 在线测试</div>
                    <form class="test-form">
                        <input type="hidden" name="method" value="${this.escapeHtml(method.fullName)}">
                        <div class="form-group">
                            <label class="form-label">请求参数 (JSON格式):</label>
                            <textarea 
                                class="form-input" 
                                placeholder="${this.generateParameterPlaceholder(method.parameters)}"
                                spellcheck="false"
                            ></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">🚀 发送测试</button>
                        <div class="response-container" style="display: none;"></div>
                    </form>
                </div>
            </div>
        </div>`;
  }

  private generateParameterPlaceholder(parameters: RpcParameterInfo[]): string {
    if (parameters.length === 0) {
      return '该方法无需参数';
    }

    if (parameters.length === 1) {
      const param = parameters[0];
      if (param.type === 'string') {
        return `"${param.name}的值"`;
      } else if (param.type === 'number') {
        return '123';
      } else if (param.type === 'boolean') {
        return 'true';
      }
      return `"${param.name}的值"`;
    }

    // 多参数情况，生成对象格式
    const exampleObj = {};
    parameters.forEach((param) => {
      if (param.type === 'string') {
        exampleObj[param.name] = `${param.name}的值`;
      } else if (param.type === 'number') {
        exampleObj[param.name] = 123;
      } else if (param.type === 'boolean') {
        exampleObj[param.name] = true;
      } else {
        exampleObj[param.name] = `${param.name}的值`;
      }
    });

    return JSON.stringify(exampleObj, null, 2);
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

```


> 代码路径  `src\rpc\rpc.decorators.ts`

```typescript
import 'reflect-metadata';
import {
  RPC_SERVICE_METADATA,
  RPC_METHOD_METADATA,
  RPC_PARAMS_METADATA,
  RpcServiceOptions,
  RpcMethodOptions,
  RpcParamOptions,
} from './rpc.interface';
// 服务装饰器
export function RpcService(
  options: RpcServiceOptions | string,
): ClassDecorator {
  return (target: any) => {
    const serviceOptions =
      typeof options === 'string' ? { name: options } : options;

    Reflect.defineMetadata(RPC_SERVICE_METADATA, serviceOptions, target);
  };
}

// 方法装饰器
export function RpcMethod(options?: RpcMethodOptions): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const methodOptions: RpcMethodOptions = options;

    Reflect.defineMetadata(
      RPC_METHOD_METADATA,
      {
        name: methodOptions.name || propertyKey.toString(),
        originalMethod: propertyKey.toString(),
        description: methodOptions.description,
        returnType: methodOptions.returnType,
        returnDescription: methodOptions.returnDescription,
      },
      descriptor.value,
    );
    return descriptor;
  };
}

// 参数装饰器
export function RpcParam(
  options: RpcParamOptions | string,
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    // 将字符串转换为选项对象
    const paramOptions =
      typeof options === 'string' ? { name: options } : options;

    // 获取当前方法已有的参数映射
    const existingParams =
      Reflect.getMetadata(RPC_PARAMS_METADATA, target, propertyKey) || {};

    // 添加新的参数映射
    existingParams[parameterIndex] = paramOptions;

    // 保存更新后的参数映射
    Reflect.defineMetadata(
      RPC_PARAMS_METADATA,
      existingParams,
      target,
      propertyKey,
    );
  };
}

```


> 代码路径  `src\rpc\rpc.errors.ts`

```typescript
import { RpcErrorCode } from './json-rpc/types';
export class RpcException extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: any,
  ) {
    super(message);
    this.name = 'RpcException';
  }
}

export class RpcParseException extends RpcException {
  constructor(data?: any) {
    super('Parse error', RpcErrorCode.PARSE_ERROR, data);
    this.name = 'RpcParseException';
  }
}

export class RpcInvalidRequestException extends RpcException {
  constructor(data?: any) {
    super('Invalid request', RpcErrorCode.INVALID_REQUEST, data);
    this.name = 'RpcInvalidRequestException';
  }
}

export class RpcMethodNotFoundException extends RpcException {
  constructor(method: string, data?: any) {
    super(`Method not found: ${method}`, RpcErrorCode.METHOD_NOT_FOUND, data);
    this.name = 'RpcMethodNotFoundException';
  }
}

export class RpcInvalidParamsException extends RpcException {
  constructor(message = 'Invalid params', data?: any) {
    super(message, RpcErrorCode.INVALID_PARAMS, data);
    this.name = 'RpcInvalidParamsException';
  }
}

export class RpcInternalException extends RpcException {
  constructor(message = 'Internal error', data?: any) {
    super(message, RpcErrorCode.INTERNAL_ERROR, data);
    this.name = 'RpcInternalException';
  }
}

```


> 代码路径  `src\rpc\rpc.interface.ts`

```typescript
import { AxiosRequestConfig } from 'axios';
import { ExtendedJsonRpcRequest, JSONValue } from './json-rpc/types';
export const RPC_SERVICE_METADATA = Symbol('RPC_SERVICE_METADATA');
export const RPC_METHOD_METADATA = Symbol('RPC_METHOD_METADATA');
export const RPC_PARAMS_METADATA = Symbol('RPC_PARAMS_METADATA');
export const RPC_MODULE_OPTIONS = Symbol('RPC_MODULE_OPTIONS');
export interface RpcModuleOptions {
  protocol: string;
  timeout?: number;
}

export interface RpcModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<RpcModuleOptions> | RpcModuleOptions;
  inject?: any[];
}

export interface RpcConfig {
  serviceName: string;
  servicePath?: string;
  groupName?: string;
  clusters?: string;
}

export interface RpcRequestClient<TParams = JSONValue> {
  rpcConfig: RpcConfig;
  payload: ExtendedJsonRpcRequest<TParams>;
  reqOptions?: AxiosRequestConfig;
}

export interface RpcServiceOptions {
  name: string;
  description?: string;
}

export interface RpcMethodOptions {
  name: string;
  description?: string;
  returnType?: string;
  returnDescription?: string;
}

export interface RpcParamOptions {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: any;
}

```


> 代码路径  `src\rpc\rpc.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  RpcModuleOptions,
  RpcModuleAsyncOptions,
  RPC_MODULE_OPTIONS,
} from './rpc.interface';
import { RpcController } from './rpc.controller';
import { RpcRegistry } from './rpc.registry';
import { RpcClient } from './rpc.client';

@Module({})
export class RpcModule {
  static forRoot(options: RpcModuleOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: RpcModule,
      imports: [DiscoveryModule],
      providers: [
        RpcRegistry,
        RpcClient,
        {
          provide: RPC_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      controllers: [RpcController],
      exports: [RPC_MODULE_OPTIONS, RpcRegistry, RpcClient], // 导出 RpcRegistry
    };
  }

  static forRootAsync(
    options: RpcModuleAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: RpcModule,
      imports: [...(options.imports || []), DiscoveryModule],
      providers: [
        RpcRegistry,
        RpcClient,
        {
          provide: RPC_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      controllers: [RpcController],
      exports: [RPC_MODULE_OPTIONS, RpcRegistry, RpcClient],
    };
  }
}

```


> 代码路径  `src\rpc\rpc.registry.ts`

```typescript
import { Injectable, OnModuleInit, HttpException } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  RPC_SERVICE_METADATA,
  RPC_METHOD_METADATA,
  RPC_PARAMS_METADATA,
} from './rpc.interface';
import {
  RpcException,
  RpcInvalidParamsException,
  RpcMethodNotFoundException,
  RpcInternalException,
} from './rpc.errors';

// 定义服务信息接口
export interface RpcServiceInfo {
  name: string;
  description?: string;
  methods: RpcMethodInfo[];
}

// 定义方法信息接口
export interface RpcMethodInfo {
  name: string;
  description?: string;
  returnType?: string;
  returnDescription?: string;
  parameters: RpcParameterInfo[];
  fullName: string; // 服务名.方法名
}

// 定义参数信息接口
export interface RpcParameterInfo {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: any;
  position: number;
}

@Injectable()
export class RpcRegistry implements OnModuleInit {
  private rpcMethods: Map<
    string,
    {
      instance: any;
      methodName: string;
      methodInfo: RpcMethodInfo;
    }
  > = new Map();

  private servicesInfo: Map<string, RpcServiceInfo> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  async onModuleInit() {
    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance) return;

      // 获取服务元数据
      const serviceOptions = Reflect.getMetadata(
        RPC_SERVICE_METADATA,
        instance.constructor,
      );
      if (!serviceOptions) return;

      // 创建服务信息
      const serviceName = serviceOptions.name;
      const serviceInfo: RpcServiceInfo = {
        name: serviceName,
        description: serviceOptions.description,
        methods: [],
      };

      this.servicesInfo.set(serviceName, serviceInfo);

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          // 获取方法的实际引用
          const method = instance[methodName];
          // 从方法本身获取元数据
          const methodMeta = Reflect.getMetadata(RPC_METHOD_METADATA, method);

          // console.log(`Scanning method ${methodName}:`, methodMeta);

          if (methodMeta) {
            const fullMethodName = `${serviceName}.${methodMeta.name}`;
            // 获取参数信息
            const prototype = Object.getPrototypeOf(instance);
            const paramMappings =
              Reflect.getMetadata(RPC_PARAMS_METADATA, prototype, methodName) ||
              {};

            // 构建参数信息数组
            const parametersInfo: RpcParameterInfo[] = [];
            for (const [index, options] of Object.entries(paramMappings)) {
              const paramIndex = Number(index);
              parametersInfo.push({
                ...(options as any),
                position: paramIndex,
              });
            }

            // 排序参数（按位置）
            parametersInfo.sort((a, b) => a.position - b.position);

            // 创建方法信息
            const methodInfo: RpcMethodInfo = {
              name: methodMeta.name,
              description: methodMeta.description,
              returnType: methodMeta.returnType,
              returnDescription: methodMeta.returnDescription,
              parameters: parametersInfo,
              fullName: fullMethodName,
            };

            // 存储方法信息
            serviceInfo.methods.push(methodInfo);

            // 存储到执行映射中
            this.rpcMethods.set(fullMethodName, {
              instance,
              methodName,
              methodInfo,
            });
          }
        },
      );
    });
  }

  // private getParameterNames(func: (...args: any[]) => any): string[] {
  //   const funcStr = func.toString();
  //   const paramStr = funcStr.slice(
  //     funcStr.indexOf('(') + 1,
  //     funcStr.indexOf(')'),
  //   );
  //   return paramStr
  //     .split(',')
  //     .map((param) => param.trim())
  //     .filter((param) => param.length > 0);
  // }

  async executeMethod(method: string, params: any): Promise<any> {
    const methodData = this.rpcMethods.get(method);
    if (!methodData) {
      throw new RpcMethodNotFoundException(method);
    }
    const { instance, methodName, methodInfo } = methodData;
    try {
      // 根据参数类型处理参数、
      const args = this.buildMethodArguments(params, methodInfo);
      // console.log('参数输出', params, methodInfo, ...args);
      const result = instance[methodName](...args);
      // 检查返回值是否是 Promise
      if (result && typeof result.then === 'function') {
        return await result; // 如果是 Promise，等待它完成
      }
      return result; // 如果不是 Promise，直接返回
    } catch (error) {
      // 执行rpc服务内部抛出的异常 直接抛掉
      if (error instanceof RpcException) {
        throw error;
      }
      // 执行rpc服务调用另一层rpc服务抛出异常后对异常进行继承抛出
      if (error instanceof HttpException) {
        throw error;
      }
      // 其他错误作为内部错误
      const errMesg = error.message || 'Method execution failed';
      throw new RpcInternalException(errMesg, {
        originalError: error.message,
        stack: error.stack,
      });
    }
  }

  private buildMethodArguments(params: any, methodInfo: RpcMethodInfo): any[] {
    try {
      // 处理空参数
      if (params === null || params === undefined) {
        // 检查必需参数
        const requiredParam = methodInfo.parameters.find((p) => p.required);
        if (requiredParam) {
          throw new Error(`Missing required parameter: ${requiredParam.name}`);
        }
        return [];
      }

      // 处理数组参数
      if (Array.isArray(params)) {
        if (params.length > methodInfo.parameters.length) {
          throw new Error('Too many parameters provided');
        }

        // 创建完整参数数组
        const args = [...params];

        // 检查必需参数是否都提供了
        for (let i = params.length; i < methodInfo.parameters.length; i++) {
          const param = methodInfo.parameters[i];
          if (param.required) {
            throw new Error(`Missing required parameter: ${param.name}`);
          }
          // 使用默认值填充剩余参数
          if ('defaultValue' in param) {
            args[i] = param.defaultValue;
          }
        }

        return args;
      }

      // 处理对象参数
      if (typeof params === 'object') {
        // 创建按参数位置排序的数组
        const args = Array(methodInfo.parameters.length).fill(undefined);

        // 按照参数名称填充参数值
        for (const param of methodInfo.parameters) {
          if (param.name in params) {
            args[param.position] = params[param.name];
          } else if (param.required) {
            throw new Error(`Missing required parameter: ${param.name}`);
          } else if ('defaultValue' in param) {
            args[param.position] = param.defaultValue;
          }
        }

        return args;
      }

      // 处理单一参数
      if (methodInfo.parameters.length === 0) {
        throw new Error('No parameters expected but received one');
      }

      return [params];
    } catch (error) {
      throw new RpcInvalidParamsException(error.message);
    }
  }
  getMethods(): string[] {
    return Array.from(this.rpcMethods.keys());
  }

  // 获取完整服务信息
  getServicesInfo(): RpcServiceInfo[] {
    return Array.from(this.servicesInfo.values());
  }
}

```


> 代码路径  `src\setup\bodyParser.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import * as bodyParser from 'body-parser';

export class BodyParserStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 设置服务请求参数题解析
    if (this.configService.isConfig('bodyParser')) {
      const bodyParserConfig = this.configService.get('bodyParser');

      for (const parserType in bodyParserConfig) {
        if (bodyParserConfig[parserType]) {
          const config = { ...bodyParserConfig[parserType] };
          const preserveRawBody = config.preserveRawBody;

          // 删除非标准选项，避免传递给 bodyParser
          delete config.preserveRawBody;

          // 根据配置决定是否添加 verify 函数
          if (preserveRawBody) {
            config.verify = (req: any, res: any, buf: Buffer) => {
              req.rawBody = buf.toString();
            };
          }
          this.app.use(bodyParser[parserType](config));
        }
      }
    }
  }
}

```


> 代码路径  `src\setup\filter.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService } from '@cs/nest-common';
import { UnifiedExceptionFilter } from '../components';
export class FilterStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const logger = this.app.get(LoggerService);
    if (this.configService.isConfig('exceptionFilter')) {
      this.app.useGlobalFilters(
        new UnifiedExceptionFilter(this.configService, logger),
      );
    }
  }
}

```


> 代码路径  `src\setup\index.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerConfigStrategy } from './logger.setup';
import { MiddlewareStrategy } from './middleware.setup';
import { InterceptorsStrategy } from './interceptors.setup';
import { PipesStrategy } from './pipes.setup';
import { FilterStrategy } from './filter.setup';
import { BodyParserStrategy } from './bodyParser.setup';
import { SwaggerStrategy } from './swagger.setup';
import { StartedStrategy } from './started.setup';
// 启动处理配置项
export const configStrategyMap: { [key: string]: typeof SetupStrategy } = {
  logger: LoggerConfigStrategy, // 日志配置
  middlewareStrategy: MiddlewareStrategy, //  中间件配置
  bodyParser: BodyParserStrategy, // body解析配置
  interceptorsStrategy: InterceptorsStrategy, // 拦截器配置
  pipesStrategy: PipesStrategy, // 管道配置
  filterStrategy: FilterStrategy, // 过滤器配置
  docs: SwaggerStrategy, // 文档配置
  started: StartedStrategy, // 启动配置
};

```


> 代码路径  `src\setup\interceptors.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService } from '@cs/nest-common';
import { LoggingInterceptor, TransformInterceptor } from '../components';
export class InterceptorsStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const logger = this.app.get(LoggerService);
    //  请求日志拦截器
    if (this.configService.isConfig('loggerInterceptor')) {
      this.app.useGlobalInterceptors(
        new LoggingInterceptor(this.configService, logger),
      );
    }
    // 响应拦截器
    if (this.configService.isConfig('transformInterceptor')) {
      this.app.useGlobalInterceptors(new TransformInterceptor());
    }
  }
}

```


> 代码路径  `src\setup\logger.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService, CommonUtil } from '@cs/nest-common';
export class LoggerConfigStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 使用自定义日志
    const logger = this.app.get(LoggerService);
    this.app.useLogger(logger);

    // 根据Console配置设置日志输出
    if (this.configService.isConfig('disableConsole')) {
      // 禁用console
      CommonUtil.disableConsole();
    }
  }
}

```


> 代码路径  `src\setup\middleware.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { ContextService, LoggerService } from '@cs/nest-common';
import { ContextMiddleware } from '../components/middleware/context.middleware';
import { ProxyMiddlewareFactory } from '../components/middleware/proxy.middleware';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

export class MiddlewareStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // cors配置
    if (this.configService.isConfig('cors')) {
      const corsConfig = this.configService.get('cors');
      this.app.enableCors(corsConfig);
    }

    // 代理中间件
    if (this.configService.isConfig('proxy')) {
      const proxyConfig = this.configService.get('proxy');
      const loggerService = this.app.get(LoggerService);
      const proxyMiddleware = ProxyMiddlewareFactory.getInstance(
        proxyConfig,
        loggerService,
      );

      // 注册全局中间件
      this.app.use((req, res, next) => {
        return proxyMiddleware.use(req, res, next);
      });
    }
    // cookie中间件
    const secret = 'yearrow-wmcp';
    this.app.use(cookieParser(secret));

    // 上下文中间件
    if (this.configService.isConfig('contextMiddleware')) {
      const contextService = this.app.get(ContextService);
      const loggerService = this.app.get(LoggerService);
      this.app.use((req, res, next) => {
        const middleware = new ContextMiddleware(contextService, loggerService);
        return middleware.use(req, res, next);
      });
    }
  }
}

```


> 代码路径  `src\setup\pipes.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
export class PipesStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const config = this.configService.get('validationPipe');
    if (this.configService.isConfig('validationPipe')) {
      this.app.useGlobalPipes(
        new ValidationPipe({
          ...config,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      );
    }
  }
}

```


> 代码路径  `src\setup\setup.interface.ts`

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@cs/nest-config';

export class SetupStrategy {
  constructor(
    protected app: NestExpressApplication,
    protected configService: ConfigService,
  ) {}
  async execute(): Promise<void> {}
}

```


> 代码路径  `src\setup\started.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { registerService } from '../nacos.naming';
import { LoggerService } from '@cs/nest-common';
export class StartedStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 服务启动相关程序
    // 设置服务访问路径
    const serverPrefix = this.configService.get('serverPath');
    // 启动服务
    const logger = this.app.get(LoggerService);
    const docsPath = serverPrefix ? `${serverPrefix}/docs` : 'docs';
    const rpcDocsPath = serverPrefix ? `${serverPrefix}/rpc/docs` : 'rpc/docs';
    if (Number(process.env.CS_PORT) > 0) {
      await this.app.listen(Number(process.env.CS_PORT));

      let startOutput = `\n- 服务 ${
        process.env.CS_NAME
      } 已经正常启动! \n- 服务访问地址: http://${process.env.CS_HOST}:${Number(
        process.env.CS_PORT,
      )}/${process.env.CS_SERVERPATH} \n`;

      if (this.configService.isConfig('docs')) {
        startOutput += `- 服务的RESTfulAPI文档地址: http://${
          process.env.CS_HOST
        }:${Number(process.env.CS_PORT)}/${docsPath} \n`;
        startOutput += `- 服务的RPC文档地址: http://${
          process.env.CS_HOST
        }:${Number(process.env.CS_PORT)}/${rpcDocsPath}`;
      }
      logger.log(startOutput);
    } else {
      logger.error('service start port not specified!');
    }

    // 注册到服务注册中心
    if (this.configService.isConfig('naming')) {
      await registerService();
    }
  }
}

```


> 代码路径  `src\setup\swagger.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
export class SwaggerStrategy extends SetupStrategy {
  setupSwagger(app, docPath, docsConfig) {
    // 加载文档
    const options = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(`${docsConfig.name}`)
      .setDescription(`${docsConfig.describe}`)
      .setVersion(`${docsConfig.version}`)
      .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(docPath, app, document);
  }
  async execute(): Promise<void> {
    // 加载文档
    const serverPrefix = this.configService.get('serverPath');
    if (this.configService.isConfig('serverPath')) {
      this.app.setGlobalPrefix(serverPrefix);
    }
    const docsPath = serverPrefix ? `${serverPrefix}/docs` : 'docs';
    if (this.configService.isConfig('docs')) {
      // 添加前缀
      const docsConfig = this.configService.get('docs');
      docsConfig.serverPrefix = serverPrefix;
      this.setupSwagger(this.app, docsPath, docsConfig);
    }
  }
}

```


> 代码路径  `src\components\decorator\index.ts`

```typescript
export * from './interceptor.decorator';

```


> 代码路径  `src\components\decorator\interceptor.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_INTERCEPTOR = 'SKIP_TRANSFORM_INTERCEPTOR';

export const skipTransformInterceptor = (): MethodDecorator =>
  // 跳过转化拦截器
  SetMetadata(SKIP_TRANSFORM_INTERCEPTOR, true);

```


> 代码路径  `src\components\filter\exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService, ErrorResult } from '@cs/nest-common';
import { AxiosError } from 'axios';
import { ConfigService } from '@cs/nest-config';
import { RpcException } from '../../rpc';
@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private isHttpException(exception: unknown): exception is HttpException {
    return (
      exception instanceof HttpException ||
      (exception?.constructor?.name === 'HttpException' &&
        typeof (exception as any).getStatus === 'function')
    );
  }

  private getErrorMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as any).message;
      return Array.isArray(message) ? message[0] : message;
    }
    return 'Internal server error';
  }

  private getAxiosErrorMessage(exception: AxiosError): string {
    // 优先级：响应数据中的消息 > 响应状态文本 > Axios 错误消息 > 默认消息
    if (exception.response?.data) {
      const responseData = exception.response.data;

      if (typeof responseData === 'string') {
        return responseData;
      }

      if (typeof responseData === 'object' && responseData !== null) {
        // 检查是否有 message 属性
        if ('message' in responseData) {
          const message = (responseData as any).message;
          return Array.isArray(message) ? message[0] : message;
        }

        // 检查是否有 error 属性
        if ('error' in responseData) {
          const error = (responseData as any).error;
          if (typeof error === 'string') {
            return error;
          }
          if (
            typeof error === 'object' &&
            error !== null &&
            'message' in error
          ) {
            return error.message || 'External service error';
          }
        }
      }
    }

    if (exception.response?.statusText) {
      return exception.response.statusText;
    }

    return exception.message || 'External service error';
  }

  private getAxiosErrorStatus(exception: AxiosError): number {
    // 如果有响应状态码，使用响应状态码
    if (exception.response?.status) {
      return exception.response.status;
    }

    // 根据 Axios 错误代码映射到合适的 HTTP 状态码
    switch (exception.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return HttpStatus.REQUEST_TIMEOUT; // 408
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        return HttpStatus.SERVICE_UNAVAILABLE; // 503
      case 'NETWORK_ERROR':
        return HttpStatus.BAD_GATEWAY; // 502
      default:
        return HttpStatus.BAD_GATEWAY; // 502
    }
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    // 获取配置
    const config = this.configService.get('exceptionFilter');
    const includeStack_response = config?.stack?.response || false;
    const includeStack_logger = config?.stack?.logger || false;
    // console.log('Exception:', exception);
    // console.log('isRpcException:', exception instanceof RpcException);
    // console.log('HttpException:', exception instanceof HttpException);
    // console.log('isAxios:', exception instanceof AxiosError);
    // console.log('Error:', exception instanceof Error);
    // 处理 RPC 异常
    if (exception instanceof RpcException) {
      // 记录错误日志
      this.logger.error(
        {
          jsonrpc: '2.0',
          error: {
            code: exception.code,
            message: exception.message,
            data: {
              type: 'RPC_ERROR',
              method: request.body?.method,
              params: request.body?.params,
              ...exception.data,
              ...(includeStack_logger ? { stack: exception.stack } : {}),
            },
            id: request.body?.id !== undefined ? request.body.id : null,
          },
        },
        'RpcExceptionFilter',
      );

      // RPC 响应始终返回 200
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: exception.code,
          message: exception.message,
          data: {
            ...exception.data,
            // 只在配置允许时添加堆栈信息，并且放在 data 字段中
            ...(includeStack_response ? { stack: exception.stack } : {}),
          },
        },
        // id: request.body?.id || null,
        id: request.body?.id !== undefined ? request.body.id : null,
      };

      return response.status(HttpStatus.OK).json(errorResponse);
    }
    // 处理 HTTP 异常
    if (this.isHttpException(exception)) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 处理重定向
      if (
        status === HttpStatus.FOUND &&
        typeof exceptionResponse === 'object' &&
        'redirectUrl' in exceptionResponse
      ) {
        return response.redirect((exceptionResponse as any).redirectUrl);
      }

      const errorResponse: ErrorResult = {
        code: status,
        message: this.getErrorMessage(exceptionResponse),
        path: request.url,
        timestamp: new Date().toISOString(),
      };
      // 记录错误日志
      if (includeStack_logger) {
        // 记录错误日志
        this.logger.error(
          {
            ...errorResponse,
            stack: exception.stack,
          },
          'HttpExceptionFilter',
        );
      } else {
        this.logger.error(errorResponse, 'HttpExceptionFilter');
      }
      if (includeStack_response) {
        errorResponse.stack = exception.stack;
      }
      return response.status(status).json(errorResponse);
    }

    // 处理 Axios 异常
    if (exception instanceof AxiosError) {
      const status = this.getAxiosErrorStatus(exception);
      const message = this.getAxiosErrorMessage(exception);

      const errorResponse: ErrorResult = {
        code: status,
        message: message,
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      // 构建详细的 Axios 错误信息用于日志记录
      const axiosErrorData = {
        type: 'AXIOS_ERROR',
        axiosCode: exception.code,
        ...(exception.config && {
          requestUrl: exception.config.url,
          requestMethod: exception.config.method?.toUpperCase(),
          requestTimeout: exception.config.timeout,
        }),
        ...(exception.response && {
          responseStatus: exception.response.status,
          responseStatusText: exception.response.statusText,
          responseHeaders: exception.response.headers,
          // 只记录响应数据的一部分，避免日志过大
          responseData:
            typeof exception.response.data === 'string'
              ? exception.response.data.substring(0, 1000)
              : exception.response.data,
        }),
        // 如果没有响应，可能是网络错误
        ...(!exception.response && {
          networkError: true,
          hostname: exception.config?.baseURL || exception.config?.url,
        }),
      };

      // 记录错误日志
      if (includeStack_logger) {
        this.logger.error(
          {
            ...errorResponse,
            ...axiosErrorData, //stack包含在axiosErrorData
            // stack: exception.stack,
          },
          'AxiosExceptionFilter',
        );
      } else {
        this.logger.error(
          {
            ...errorResponse,
          },
          'AxiosExceptionFilter',
        );
      }

      // 根据配置决定是否在响应中包含堆栈信息
      return response.status(status).json({
        ...errorResponse,
        ...(includeStack_response ? { ...axiosErrorData } : {}),
      });
    }

    // 处理其他未知异常
    const errorResponse: ErrorResult = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // 记录错误日志
    if (includeStack_logger) {
      this.logger.error(
        {
          ...errorResponse,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'ExceptionFilter',
      );
    } else {
      this.logger.error(errorResponse, 'ExceptionFilter');
    }

    if (includeStack_response) {
      errorResponse.stack =
        exception instanceof Error ? exception.stack : undefined;
    }
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse);
  }
}

```


> 代码路径  `src\components\interceptors\logging.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { LoggerService } from '@cs/nest-common';
import { ConfigService } from '@cs/nest-config';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const loggerInterceptor = this.config.get('loggerInterceptor');
    if (!loggerInterceptor) {
      return next.handle();
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, url } = request;
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    // 收集请求信息
    const requestDetails = {
      method,
      url,
      handler,
      controller,
      // 可以根据配置决定是否记录
      ...(loggerInterceptor.moreInfo && {
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body,
      }),
    };

    this.logger.verbose(
      `>>>>>> Incoming Request: ${JSON.stringify(requestDetails)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        // 收集响应信息
        const responseDetails = {
          method,
          url,
          responseTime: `${responseTime}ms`,
          ...(loggerInterceptor.moreInfo && {
            statusCode: response.statusCode,
            responseBody: data,
          }),
        };
        // 记录响应信息
        this.logger.verbose(
          `<<<<<<Outgoing Response: ${JSON.stringify(responseDetails)}`,
        );
      }),
    );
  }
}

```


> 代码路径  `src\components\interceptors\transform.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result, EHttpStatus } from '@cs/nest-common';
import { isObject } from 'class-validator';
import { SKIP_TRANSFORM_INTERCEPTOR } from '../decorator/interceptor.decorator';

@Injectable()
export class TransformInterceptor<T extends Record<string, any>>
  implements NestInterceptor<T, Result<T>>
{
  private readonly reflector = new Reflector();
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Result<T>> {
    const isSkipIntercept = this.reflector.get<boolean>(
      SKIP_TRANSFORM_INTERCEPTOR,
      context.getHandler(),
    );

    // 跳过拦截器
    if (isSkipIntercept) {
      return next.handle().pipe(map((data: any) => data));
    }
    const request = context.switchToHttp().getRequest();
    // 检查请求头中是否包含 RPC 标识
    const isRpcRequest = request.headers['x-rpc-request'] === 'true';
    if (isRpcRequest) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: T) => {
        let message = '';
        if (isObject(data)) {
          message = (data as any).message;
        }
        const result: Result<T> = {
          code: response.statusCode,
          status: EHttpStatus.Success,
          message,
          result: data !== undefined ? data : null,
        };
        return result;
      }),
    );
  }
}

```


> 代码路径  `src\components\middleware\context.middleware.ts`

```typescript
import { Request, Response } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import {
  ContextService,
  LoggerService,
  UserContext,
  CONTEXT_HEADER,
} from '@cs/nest-common';
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    private readonly logger: LoggerService,
  ) {}

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  use(req: Request, res: Response, next: () => void) {
    // 注入请求服务信息
    res.header('X-Powered-By', process.env.CS_NAME);

    // 辅助函数：将 kebab-case 头部转换为 camelCase
    const transformHeaderToCamelCase = (header: string): string => {
      // 移除 x- 前缀并转换为小驼峰
      return header
        .toLowerCase()
        .replace(/^x-/, '')
        .replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
    };

    // 辅助函数：提取自定义头部
    const extractCustomHeaders = (
      headers: Record<string, string | string[] | undefined>,
    ): Record<string, string> => {
      const result: Record<string, string> = {};
      const skipHeaders = ['x-rpc-request', 'x-powered-by', 'x-tracking-id'];

      Object.keys(headers).forEach((headerKey) => {
        const lowerCaseKey = headerKey.toLowerCase();

        // 检查是否符合自定义头部格式且不在跳过列表中
        if (
          /^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/i.test(lowerCaseKey) &&
          !skipHeaders.includes(lowerCaseKey)
        ) {
          const headerValue = headers[headerKey];
          if (headerValue) {
            const camelCaseKey = transformHeaderToCamelCase(lowerCaseKey);
            result[camelCaseKey] = Array.isArray(headerValue)
              ? headerValue[0]
              : headerValue;
          }
        }
      });
      return result;
    };

    // 区分是http还是rpc请求
    const isRpc = req.headers['x-rpc-request'];

    if (isRpc) {
      // RPC请求处理逻辑
      const contextHeader = req.headers[CONTEXT_HEADER.toLowerCase()];
      let lastContext: UserContext;

      if (contextHeader && typeof contextHeader === 'string') {
        lastContext = this.contextService.decodeContext(
          contextHeader,
        ) as UserContext;
      }

      // 将上个请求的初始化信息写入history
      if (!!lastContext && lastContext.history) {
        lastContext.history.push({
          requestId: lastContext.requestId,
          startTime: lastContext.startTime,
          url: lastContext.url,
          method: lastContext.method,
        });

        if (lastContext.history.length > 30) {
          this.logger.warn(
            `history length is too long, length is ${lastContext.history.length}`,
          );
        }

        if (lastContext.history.length > 100) {
          throw new Error(`history length is too long!`);
        }
      }

      // 重新生成新的requestInfo
      lastContext = Object.assign(
        lastContext || {
          history: [],
        },
        {
          requestId: this.generateRequestId(),
          startTime: Date.now(),
          url: req.originalUrl,
          method: req.method,
        },
      );

      // 提取并转换自定义头部，然后合并到上下文
      const customHeaders = extractCustomHeaders(req.headers);
      Object.assign(lastContext, customHeaders);
      this.contextService.runWithContext(lastContext, async () => {
        next();
      });
    } else {
      // HTTP请求处理
      const requestId = this.generateRequestId();

      // 创建基础上下文
      const context: UserContext = {
        requestId: requestId,
        trackingId: requestId,
        startTime: Date.now(),
        url: req.originalUrl,
        method: req.method,
        history: [],
      };

      // 提取并转换自定义头部，然后合并到上下文
      const customHeaders = extractCustomHeaders(req.headers);
      Object.assign(context, customHeaders);
      this.contextService.runWithContext(context, async () => {
        next();
      });
    }
  }
}

```


> 代码路径  `src\components\middleware\proxy.middleware.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { LoggerService } from '@cs/nest-common';

export interface ProxySite {
  proxyPrefix: string;
  targetUrl: string;
  skipPath?: string[];
  pathRewrite?: { [key: string]: string };
}

export interface ProxyConfig {
  enable: boolean;
  sites: ProxySite[];
}

@Injectable()
export class ProxyMiddlewareFactory {
  private static instance: ProxyMiddleware | null = null;

  static getInstance(
    proxyConfig: ProxyConfig,
    loggerService: LoggerService,
  ): ProxyMiddleware {
    if (!this.instance) {
      this.instance = new ProxyMiddleware(proxyConfig, loggerService);
    }
    return this.instance;
  }
}

@Injectable()
export class ProxyMiddleware {
  private readonly proxyHandlers: Map<string, RequestHandler> = new Map();
  private readonly proxyPathCache: Map<string, string | null> = new Map();
  private initialized = false;

  constructor(
    private readonly proxyConfig: ProxyConfig,
    private readonly logger: LoggerService,
  ) {
    this.initialize();
  }

  private initialize(): void {
    // 防止重复初始化
    if (this.initialized) {
      return;
    }

    this.setupProxyHandlers();
    this.initialized = true;
  }

  private setupProxyHandlers(): void {
    if (!this.proxyConfig.enable || !this.proxyConfig.sites?.length) {
      this.logger.log('代理配置未启用或站点配置为空');
      return;
    }

    // 按特定性排序代理站点（更具体的路径优先）
    const sortedSites = [...this.proxyConfig.sites].sort(
      (a, b) => b.proxyPrefix.length - a.proxyPrefix.length,
    );

    for (const site of sortedSites) {
      const { proxyPrefix, targetUrl, skipPath, pathRewrite } = site;

      // 优化过滤器函数以提高性能
      const filter = skipPath?.length
        ? (pathname: string) => {
            return !skipPath.some((path) => {
              const regex = new RegExp(`^/${path}(?:/|$)`);
              return regex.test(pathname);
            });
          }
        : undefined;
      // 构建代理配置，添加防循环机制
      const options = {
        target: targetUrl,
        changeOrigin: true,
        pathRewrite,
        logLevel: 'warn',
        onProxyReq: (proxyReq) => {
          // 标记请求已被代理
          proxyReq.setHeader('X-Proxied-By', 'nest-proxy');
        },
      };
      // 创建代理处理器
      const handler = filter
        ? createProxyMiddleware({
            ...options,
            pathFilter: filter,
          })
        : createProxyMiddleware(options);

      // 存储代理处理器
      this.proxyHandlers.set(proxyPrefix, handler);

      // 只在初始化时记录日志，避免重复输出
      const skipPathStr = skipPath?.length
        ? `----> 跳过路径：[ ${skipPath.join(',')}]`
        : '';
      this.logger.log(
        `已代理地址：${proxyPrefix} ---> ${targetUrl}${proxyPrefix} ${skipPathStr}`,
      );
    }
  }

  // 优化路径匹配，使用缓存提高性能
  private findBestProxyMatch(path: string): string | null {
    // 检查缓存
    if (this.proxyPathCache.has(path)) {
      return this.proxyPathCache.get(path) || null;
    }

    // 确保按照路径长度排序进行匹配
    const prefixes = Array.from(this.proxyHandlers.keys()).sort(
      (a, b) => b.length - a.length,
    );

    for (const prefix of prefixes) {
      if (path.startsWith(prefix)) {
        // 缓存结果并返回
        this.proxyPathCache.set(path, prefix);
        return prefix;
      }
    }

    // 缓存未匹配的结果
    this.proxyPathCache.set(path, null);
    return null;
  }

  /**
   * 中间件处理函数
   */
  use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    // 防止代理循环
    if (req.headers['x-proxied-by'] === 'nest-proxy') {
      return next();
    }

    // 检查代理配置是否启用
    if (!this.proxyConfig.enable) {
      return next();
    }
    try {
      // 查找最佳匹配的代理路径
      const matchedPrefix = this.findBestProxyMatch(req.path);
      if (matchedPrefix) {
        const handler = this.proxyHandlers.get(matchedPrefix);
        return handler(req, res, next);
      }
    } catch (error) {
      // 错误处理，确保请求不中断
      this.logger.error(
        `代理处理异常: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 没有匹配的代理规则，继续处理
    next();
  }
}

```


> 代码路径  `src\rpc\json-rpc\client.ts`

```typescript
// jsonRpcClient.ts

import {
  JsonRpcRequest,
  JsonRpcResponse,
  JSONRPCConfig,
  JsonRpcRequestClient,
} from './types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class JsonRpcClient {
  private axiosInstance: AxiosInstance;
  constructor(private rpcConfig: JSONRPCConfig) {
    this.axiosInstance = axios.create({
      timeout: rpcConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-request': 'true',
      },
    });

    // this.axiosInstance.interceptors.request.use(
    //   (config) => {
    //     // 请求拦截
    //     return config;
    //   },
    //   (error) => {
    //     return Promise.reject(error);
    //   },
    // );

    // this.axiosInstance.interceptors.response.use(
    //   (response) => {
    //     // 响应拦截
    //     return response;
    //   },
    //   (error) => {
    //     if (
    //       error.code === 'ECONNABORTED' &&
    //       error.message.includes('timeout')
    //     ) {
    //       // 超时处理
    //       return Promise.reject(new Error('Request timeout'));
    //     }
    //     return Promise.reject(error);
    //   },
    // );
  }

  public async call<TParams, TResult>(
    requestClient: JsonRpcRequestClient<TParams>,
    reqOptions?: AxiosRequestConfig,
  ): Promise<JsonRpcResponse<TResult>> {
    try {
      const { req, url } = requestClient;
      const request: JsonRpcRequest<TParams> = {
        jsonrpc: '2.0',
        id: !req.isNotify ? uuidv4() : null,
        method: req.method,
        params: req.params,
      };
      // console.log('request', request, url, reqOptions);
      // 如果是通知类请求，则直接发送请求并返回
      if (req.isNotify) {
        this.sendNotification<TParams>(request, url, reqOptions);
        return;
      }
      const response = await this.sendRequest<TParams, TResult>(
        request,
        url,
        reqOptions,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  // 发送通知类请求的方法
  private async sendNotification<TParams>(
    request: JsonRpcRequest<TParams>,
    url: string,
    reqOptions?: AxiosRequestConfig,
  ): Promise<void> {
    await this.axiosInstance.post(url, request, reqOptions);
  }

  private async sendRequest<TParams, TResult>(
    request: JsonRpcRequest<TParams>,
    url: string,
    reqOptions?: AxiosRequestConfig,
  ): Promise<JsonRpcResponse<TResult>> {
    const response = await this.axiosInstance.post(url, request, reqOptions);
    return response.data;
  }
}

```


> 代码路径  `src\rpc\json-rpc\rpc-error-transformer.ts`

```typescript
// rpc-error-transformer.ts
import {
  HttpException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { JSONRPCError, RpcErrorCode } from './types';

/**
 * RPC错误码到HTTP异常的智能转换器
 * 基于JSON-RPC 2.0规范和RESTful API最佳实践
 */
export function rpcErrorToHttpError(rpcError: JSONRPCError): HttpException {
  const { code, message } = rpcError;

  switch (code) {
    // 请求格式类错误 -> 400 Bad Request
    case RpcErrorCode.PARSE_ERROR:
    case RpcErrorCode.INVALID_REQUEST:
    case RpcErrorCode.INVALID_PARAMS:
      return new BadRequestException(message);

    // 资源不存在类错误 -> 404 Not Found
    case RpcErrorCode.METHOD_NOT_FOUND:
    case RpcErrorCode.SERVICE_NOT_FOUND:
      return new NotFoundException(message);

    // 数据验证类错误 -> 422 Unprocessable Entity
    case RpcErrorCode.VALIDATION_ERROR:
      return new UnprocessableEntityException(message);

    // 认证授权类错误 -> 401 Unauthorized
    case RpcErrorCode.UNAUTHORIZED:
      return new UnauthorizedException(message);

    // 服务可用性类错误 -> 503 Service Unavailable
    case RpcErrorCode.SERVICE_UNAVAILABLE:
      return new ServiceUnavailableException(message);

    // 限流类错误 -> 429 Too Many Requests
    case RpcErrorCode.RATE_LIMIT_EXCEEDED:
      return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

    // 服务器内部错误 -> 500 Internal Server Error
    case RpcErrorCode.INTERNAL_ERROR:
    case RpcErrorCode.TIMEOUT_ERROR:
    default:
      return new InternalServerErrorException(message || '服务内部错误');
  }
}

```


> 代码路径  `src\rpc\json-rpc\rpc-helpers.ts`

```typescript
// utils/rpc-helpers.ts
import {
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  JSONRPCErrorResponse,
} from './types';
import { rpcErrorToHttpError } from './rpc-error-transformer';
import { RpcException } from '../rpc.errors';

export interface RpcResultOptions {
  throwOnError?: boolean;
  isHttpError?: boolean;
}

// 检查响应是否存在（非 void）
export function isJsonRpcResponse(obj: any): obj is JsonRpcResponse {
  return obj && typeof obj === 'object' && 'jsonrpc' in obj;
}
// 检查是否为成功响应
export function isJsonRpcSuccessResponse(
  obj: JsonRpcResponse,
): obj is JsonRpcSuccessResponse {
  return 'result' in obj;
}

// 检查是否为错误响应
export function isJsonRpcErrorResponse(
  obj: JsonRpcResponse,
): obj is JSONRPCErrorResponse {
  return 'error' in obj;
}

// 安全地提取结果并进行类型转换
// export function getRPCResult<T>(
//   response: JsonRpcResponse<any> | void,
// ): T | null {
//   // Handle void case first
//   if (!response) {
//     return null;
//   }

//   // We know response is a JsonRpcResponse now, not void
//   if (isJsonRpcErrorResponse(response)) {
//     return response.error as any;
//   }

//   return response.result as T;
// }

export function getRPCResult<T>(
  response: JsonRpcResponse | void,
  options: RpcResultOptions = {},
): T | null {
  const { throwOnError = true, isHttpError = true } = options;

  if (!response) {
    return null;
  }
  if (isJsonRpcErrorResponse(response)) {
    if (throwOnError) {
      const exception = isHttpError
        ? rpcErrorToHttpError(response.error)
        : new RpcException(
            response.error.message,
            response.error.code,
            response.error.data,
          );
      throw exception;
    }
    return response.error as any;
  }

  return response.result as T;
}

```


> 代码路径  `src\rpc\json-rpc\types.ts`

```typescript
export type JSONRPC = '2.0';
export const JSONRPC: JSONRPC = '2.0';

export type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | JSONArray
  | null;

export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = Array<JSONValue>;
export type JSONRPCID = number | string | null;

export interface JsonRpcRequest<TParams = JSONValue> {
  jsonrpc: JSONRPC;
  method: string;
  params?: TParams;
  id?: JSONRPCID;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: JSONRPC;
  result: JSONValue;
  id: JSONRPCID;
}

export interface JSONRPCErrorResponse {
  jsonrpc: JSONRPC;
  error: JSONRPCError;
  id: JSONRPCID;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcResponse<TResult = any> {
  jsonrpc: JSONRPC;
  result?: TResult;
  error?: JSONRPCError;
  id: JSONRPCID;
}

export interface JSONRPCConfig {
  protocol: string;
  timeout: number;
}

export interface JsonRpcRequestClient<TParams = JSONValue> {
  url: string;
  req: ExtendedJsonRpcRequest<TParams>;
}

export interface ExtendedJsonRpcRequest<TParams = JSONValue>
  extends Pick<JsonRpcRequest<TParams>, 'method' | 'params'> {
  isNotify?: boolean;
}

export enum RpcErrorCode {
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom error codes (range -32000 to -32099)
  SERVICE_NOT_FOUND = -32000,
  SERVICE_UNAVAILABLE = -32001,
  TIMEOUT_ERROR = -32002,
  VALIDATION_ERROR = -32003,
  UNAUTHORIZED = -32004,
  RATE_LIMIT_EXCEEDED = -32005,
}

```


> 代码路径  `src\rpc\json-rpc\utils.ts`

```typescript
import { JsonRpcResponse, JSONRPCID, JSONValue } from './types';
import {
  RpcInvalidRequestException,
  RpcInvalidParamsException,
} from '../rpc.errors';

interface ValidationResult {
  isValid: boolean;
  error?: JsonRpcResponse;
}
const ALLOWED_REQUEST_MEMBERS = new Set(['jsonrpc', 'method', 'params', 'id']);

function isValidParam(param: any): boolean {
  const validTypes = ['string', 'number', 'boolean', 'object', 'undefined'];

  if (param === null) return true;

  if (validTypes.includes(typeof param)) {
    if (typeof param === 'object') {
      return (
        Array.isArray(param) ||
        Object.getPrototypeOf(param) === Object.prototype
      );
    }
    return true;
  }

  return false;
}

function hasExtraMembers(request: any): boolean {
  return Object.keys(request).some((key) => !ALLOWED_REQUEST_MEMBERS.has(key));
}

function throwError(
  request: any,
  error: typeof RpcInvalidRequestException | typeof RpcInvalidParamsException,
  message: string,
): never {
  // 在抛出异常前重置请求的 id
  request.id = null;
  throw new error(message);
}

export function validateJsonRpcRequest(request: any): ValidationResult {
  // 基础结构验证
  if (!request || typeof request !== 'object') {
    throwError(
      request,
      RpcInvalidRequestException,
      'Request must be an object',
    );
  }

  // 检查是否有额外的成员
  if (hasExtraMembers(request)) {
    throwError(
      request,
      RpcInvalidRequestException,
      'Contains unrecognized members. Only jsonrpc, method, params, and id are allowed',
    );
  }

  // 验证 jsonrpc 版本
  if (request.jsonrpc !== '2.0') {
    throwError(
      request,
      RpcInvalidRequestException,
      'Unsupported JSON-RPC version',
    );
  }

  // 验证方法名
  if (typeof request.method !== 'string' || request.method.trim() === '') {
    throwError(
      request,
      RpcInvalidRequestException,
      'Method must be a non-empty string',
    );
  }

  // 验证参数
  if (request.params !== undefined) {
    // 检查单个参数的情况
    if (isValidParam(request.params)) {
      return;
    }

    throwError(
      request,
      RpcInvalidParamsException,
      'Params must be primitive type, object, or array',
    );
  }

  // 验证 ID
  if (request.id !== undefined && request.id !== null) {
    if (!(typeof request.id === 'string' || typeof request.id === 'number')) {
      throwError(
        request,
        RpcInvalidRequestException,
        'ID must be a string, number, or null',
      );
    }
  }
}

export function createJsonRpcSuccess(
  id: JSONRPCID,
  result: JSONValue,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    result,
    id: id || null,
  };
}

export function createJsonRpcError(
  id: JSONRPCID,
  code: number,
  message: string,
  data?: any,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data,
    },
    id: id || null,
  };
}

```


#### 代码说明



## 概述
`@cs/nest-cloud` 是一个基于 NestJS 的微服务通用组件库，主要提供了服务的启动方法、服务注册、服务间远程调用方法。该库基于 HTTP 协议和 JSON-RPC 2.0 规范协议实现，支持服务发现、负载均衡等特性。



## 安装
```bash
npm install @cs/nest-cloud
```

## 快速开始
### 1. 基础模块配置
使用 `CSModule` 装饰器快速配置应用模块：

```typescript
import { CSModule } from '@cs/nest-cloud';
import { YourController } from './your.controller';
import { YourService } from './your.service';

@CSModule({
  controllers: [YourController],
  providers: [YourService],
}, {
  configFilePath: './dist/config.yaml',
  onlyLocal: false,
  configFrom: 'nacos'
})
export class AppModule {}
```

### 2. 服务启动
使用 `bootstrap` 方法启动服务：

```typescript
import { bootstrap } from '@cs/nest-cloud';
import { AppModule } from './app.module';

async function main() {
  await bootstrap(AppModule, async (app, config) => {
    // 可选的启动回调
    console.log('服务启动成功');
  });
}

main();
```

## RPC 模块
RPC 模块提供了服务间远程调用的能力，基于 HTTP 协议和 JSON-RPC 2.0 规范协议实现，支持服务发现、负载均衡等特性。

### 1. 安装和配置
> 在@CSModule 模块装饰器中已默认全局导入了 RpcModule，无需单独引入。
>

单独使用时在应用模块中导入 RpcModule：

```typescript
import { RpcModule } from '@cs/nest-cloud';

@Module({
  imports: [
    RpcModule.forRoot({
      timeout: 5000,         // 请求超时时间(ms)
      protocol: 'http',      // 协议，支持http/https
    }),
  ],
})
export class AppModule {}
```

### 2. RPC 服务定义
实现 RPC 方法时，需要对服务、方法和参数进行标注才能注入到注册列表中，以便其他服务调用。在 `@cs/nest-cloud` 包中实现了 `RpcService`、`RpcMethod`、`RpcParam` 三个装饰器，用于标注服务、方法和参数。

除了服务名称、方法名称、参数名称强制要求外，其他描述信息主要作用于服务文档展示，方便开发人员了解服务接口的用途和参数含义，在服务中可在浏览器通过访问 `<服务地址>/rpc` 查询服务文档。

示例如下：

```typescript
@RpcService({
  name: 'userService',
  description: '用户相关服务，包括身份验证和用户信息管理'
})
export class UserService {
  @RpcMethod({
    name: 'validateServiceTicket',
    description: '验证服务票据的有效性',
    returnType: 'boolean',
    returnDescription: '票据验证结果，true表示有效，false表示无效'
  })
  async validateServiceTicket(
    @RpcParam({
      name: 'ticket',
      description: '服务票据',
      type: 'string',
      required: true
    })
    ticket: string,
    
    @RpcParam({
      name: 'service',
      description: '请求服务的URL',
      type: 'string',
      required: true
    })
    service: string,
    
    @RpcParam({
      name: 'renew',
      description: '是否强制重新认证',
      type: 'boolean',
      required: false,
      defaultValue: false
    })
    renew?: boolean,
    
    @RpcParam({
      name: 'format',
      description: '返回数据格式',
      type: 'string',
      required: false,
      defaultValue: 'JSON'
    })
    format: 'JSON' | 'XML' = 'JSON',
  ) {
    // 方法实现...
    return true;
  }
}
```



### 3. 调用 RPC 服务
在服务中注入 RpcClient：

```typescript
import { RpcClient } from '@cs/nest-cloud';

@Injectable()
export class YourService {
  constructor(private readonly rpcClient: RpcClient) {}

  async callRemoteService() {
    const result = await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'remote-service',    // 目标服务名称
        groupName: 'default',             // 目标服务组名 可以省略
        clusters: 'cluster1',             // 目标服务集群 可以省略
        servicePath: '/sessionServer',    // 目标服务路径 可以省略
      },
      payload: {
        method: 'session.setSession',  // 调用方法 一般为服务名.方法名
        params: ['11111', { name: '1111' }], // 参数 
        isNotify: false, // 没有包含"id"成员的请求对象为通知， 作为通知的请求对象表明客户端对相应的响应对象并不感兴趣，本身也没有响应对象需要返回给客户端。服务端必须不回复一个通知，该参数默认不传
      },
      reqOptions: {
        // axiosConfig   可省略 改变超时 请求的headers等
      }
    });
  }
}
```

### 4. 参数传递的支持方式
#### 空参数
```typescript
// 不传任何参数
{
  "method": "service.method"
}
// 或显式传 null/undefined
{
  "method": "service.method",
  "params": null 
}
```

#### 单个值参数
```typescript
// 直接传递单个值
{
  "method": "service.method",
  "params": "some value"
}
```

#### 数组形式参数
```typescript
// 按顺序传递多个参数
{
  "method": "service.method", 
  "params": ["test", 18, "beijing"]
}
```

#### 对象形式参数（命名参数）
```typescript
// 通过参数名传递
{
  "method": "service.method",
  "params": {
    "name": "test",
    "age": 18,
    "address": "beijing"
  }
}
```

**注意事项：**

+ 对象形式传参时，参数名必须与方法定义的参数名完全匹配
+ 数组形式传参时，参数数量不能超过方法定义的参数数量
+ 参数验证失败会抛出 RpcInvalidParamsException 异常

### 5. 带结果提取的调用
```typescript
// 使用 callWithExtract 方法，自动提取结果
const user = await this.rpcClient.callWithExtract({
  rpcConfig: {
    serviceName: 'user-service',
    servicePath: 'userServer'
  },
  payload: {
    method: 'userService.getUserById',
    params: ['user-123']
  }
}, {
  isHttpError: true,    // 是否转换为HTTP异常
  throwOnError: true    // 是否在出错时抛出异常
});
```



> 注意：一般rpc调用使用`rpcClient.call`方法返回jsonrpc的原始返回格式，需要对请求结果单独进行处理。方法中提供了`getRpcResut`方法对原始结果进行解析和提取。如果想直接对结果进行解析处理，直接使用`rpcClient.callWithExtract`进行rpc调用。解析函数和提取方法会对返回结果中的结果进行解析，并对错误抛出异常。
>



### 6. 获取 ID 方法


```typescript
const id = await this.rpcClient.getNewId();  // 获取单个id
const ids = await this.rpcClient.getNewId(100);  // 获取多个id
```



---

## 服务启动
服务启动提供了 `bootstrap` 方法。该方法提供了两个参数：

+ `rootModule` 为服务的根模块财政，将根模块传入启动函数
+ `appStartedCall` 启动方法的回调方法



```typescript
export async function bootstrap(
  rootModule: any, // 加载根模块
  appStartedCall?: AsyncFunction, // 启动中间回调
) {}
```



### 启动配置策略
运行`bootstrap`方法后运行启动策略，根据各项的配置项初始化内置的服务组件。

+ **loggerStrategy**: 日志配置
+ **middlewareStrategy**: 中间件配置
+ **interceptorsStrategy**: 拦截器配置
+ **pipesStrategy**: 管道配置
+ **filterStrategy**: 过滤器配置
+ **docs**: Swagger 文档配置
+ **started**: 服务启动配置

### 启动服务组件
#### loggerStrategy
##### logger
服务启动后默认加载实现的日志模块，将nestjs的日志默认全局使用实现的日志模块

> logger模块在`@cs/nest-common`包中实现。
>

```typescript
 // 使用自定义日志
  const logger = this.app.get(LoggerService);
  this.app.useLogger(logger);
```



##### console
console日志可在系统配置中进行控制。

```yaml
disableConsole: false
```

#### middlewareStrategy
##### 上下文中间件
自动处理请求上下文，支持 HTTP 和 RPC 请求

> context模块在`@cs/nest-common`包中实现。
>

```yaml
contextMiddleware: true  #默认启动
```

上下文信息包括：

+ `requestId`: 请求唯一标识
+ `trackingId`: 追踪ID
+ `startTime`: 请求开始时间
+ `url`: 请求URL
+ `method`: 请求方法
+ `history`: 请求历史（RPC链路追踪） 

##### 代理中间件
> 用法详见代理中间件文档
>

```yaml
# 代理配置
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-service.com'
      pathRewrite:
        '^/api': ''
      skipPath:
        - 'health'
        - 'metrics'
```



##### cors 中间件
跨域配置此中间件采用nestjs自带中间件，在配置中进行配置是否开启以及禁用项。

```yaml
  cors:
    origin: 'http://localhost:8088'
    credentials: true
    preflightContinue: false
    methods: 
      - 'GET'
      - 'POST'
      - 'PUT'
      - 'DELETE'
    allowedHeaders: 
      - 'Content-Type'
      - 'Authorization'
```



##### cookieParser
cookie中间件集成插件`cookie-parser`。默认开启，不经过配置控制。



##### bodyParser
bodyParser中间件集成插件`body-parser`

配置如下：

```yaml
bodyParser: 
    json:
      limit: '5mb'
      preserveRawBody: true # 控制是否保留原始请求体
    urlencoded:
      extended: true
      limit: '5mb'
      preserveRawBody: true
    text:
      limit: '5mb'
      preserveRawBody: false 
      
```



#### interceptorsStrategy
##### 日志拦截器
记录请求和响应信息，在调试模式下很有用：

```yaml
loggerInterceptor: #默认不开启，需要手动配置
  moreInfo: true  # 记录详细信息（headers、body等）
```

##### 响应转换拦截器
统一API响应格式：

```typescript
// 响应格式
{
  "code": 200,
  "status": "success",
  "message": "",
  "result": { /* 实际数据 */ }
}

// 跳过转换（在某些接口上）
import { skipTransformInterceptor } from '@cs/nest-cloud';

@Get('raw-data')
@skipTransformInterceptor()
getRawData() {
  return { raw: 'data' };
}
```



配置如下：

```yaml
transformInterceptor: true
```



#### pipesStrategy
##### validationPipe
我们的标准服务中内置了nestjs官方的`validationPipe`管道。管道的作用详见文档：[https://www.yuque.com/danielmlc/cb8wsn/qic4ad6l4qd7m839/edit?toc_node_uuid=EfQXceUPinyCTd7A](https://www.yuque.com/danielmlc/cb8wsn/qic4ad6l4qd7m839/edit?toc_node_uuid=EfQXceUPinyCTd7A)



配置如下： 改配置默认全局启用，可在默认配置基础上进行自定义

```yaml
validationPipe:
    whitelist: true #  过滤掉没有装饰器的属性
    skipMissingProperties: true # 是否跳过缺失的属性
    transform: true # 是否转换类型
```



#### filterStrategy


##### exceptionFilter
异常过滤器处理服务中抛出的大部分错误，有httpexception、rpcexception、axiosexception、error等类型的错误。

异常过滤器默认在服务中全局注册，配置如下：

```yaml
exceptionFilter:  # 异常过滤器
  stack: 
    response: false # 是否在响应打印堆栈信息 （默认不开启）
    logger: true # 是否在日志中打印堆栈信息 （默认开启）
```



#### docs
服务中根据配置开启文档。默认不开启服务文档。



```yaml
docs:
  name: '用户服务 API'
  describe: '提供用户管理相关接口'
  version: '1.0.0'
```



#### started
服务启动中，输出服务访问路径。根据配置注册服务到注册中心。



服务启动相关配置：

```yaml
  name: 'node-database-service'
  port: 3023  #部署环境中一般不需要配置
  serverPath: 'ormServer'
```



注册中心配置：

```yaml
naming: true
```

## 异常处理
当服务中需要抛出异常时，需要判断属于哪种异常，一般在提供给站点的控制器中抛出 `HttpException` 异常，在服务中一般抛出 `RpcException` 异常。

### 抛出 RPC 异常
```typescript
import { RpcException, RpcErrorCode } from '@cs/nest-cloud';

//... 服务上下文
throw new RpcException('error message', RpcErrorCode.INTERNAL_ERROR);
```

### 抛出 HTTP 异常
```typescript
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

//... 站点控制器
throw new HttpException('error message', HttpStatus.INTERNAL_SERVER_ERROR);
```



> 一般所有的错误都会在异常过滤器中被接受并被格式化处理。想要查看比较详细的错误，可以更改异常过滤器的配置来收集错误。
>





### RPC错误码定义
```typescript
export enum RpcErrorCode {
  // 标准 JSON-RPC 2.0 错误码
  PARSE_ERROR = -32700,        // 解析错误
  INVALID_REQUEST = -32600,    // 无效请求
  METHOD_NOT_FOUND = -32601,   // 方法未找到
  INVALID_PARAMS = -32602,     // 无效参数
  INTERNAL_ERROR = -32603,     // 内部错误

  // 自定义错误码
  SERVICE_NOT_FOUND = -32000,     // 服务未找到
  SERVICE_UNAVAILABLE = -32001,   // 服务不可用
  TIMEOUT_ERROR = -32002,         // 超时错误
  VALIDATION_ERROR = -32003,      // 验证错误
  UNAUTHORIZED = -32004,          // 未授权
  RATE_LIMIT_EXCEEDED = -32005,   // 限流
}
```

## 接口文档
### Swagger 配置
```yaml
docs:
  name: '用户服务 API'
  describe: '提供用户管理相关接口'
  version: '1.0.0'
```

访问文档：`http://your-service/docs`

### RPC 服务文档
访问 RPC 服务文档：`http://your-service/rpc`

返回已注册的 RPC 服务信息，包括：

+ 服务名称和描述
+ 方法列表
+ 参数定义
+ 返回值类型



## HTTP 代理中间件
### 简介
这个 HTTP 代理中间件基于 `http-proxy-middleware` 库开发，专为 NestJS 应用程序设计，提供灵活的 API 代理功能。通过这个中间件，你可以轻松地将前端请求代理到不同的后端服务，解决跨域问题，并支持各种高级代理功能。

### 特性
+ 支持多个代理目标
+ 路径过滤与跳过
+ 路径重写
+ 防循环代理
+ 性能优化缓存

### 配置示例
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/inner'
      targetUrl: 'http://192.168.5.41:3013'
      pathRewrite: 
        '^/inner': '/inner'
    - proxyPrefix: '/'
      targetUrl: 'http://beta.yearrow.com'
      skipPath:
        - 'casInnerDemoServer'
        - 'inner'
```

### 配置参数说明
| 参数 | 类型 | 描述 |
| --- | --- | --- |
| `enable` | boolean | 是否启用代理 |
| `sites` | ProxyConfig[] | 代理配置数组 |
| `proxyPrefix` | string | 代理路径前缀 |
| `targetUrl` | string | 目标服务器 URL |
| `pathRewrite` | object | 路径重写规则 |
| `skipPath` | string[] | 要跳过的路径数组 |


### 高级配置示例
#### 带路径重写的代理
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-server.com'
      pathRewrite:
        '^/api': '' # 将 /api/users 重写为 /users
```

#### 带过滤的代理 
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-server.com'
      skipPath:
        - 'health'    # 跳过健康检查路径
        - 'metrics'   # 跳过指标路径
```

#### 多目标代理
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api/users'
      targetUrl: 'http://user-service.com'
    - proxyPrefix: '/api/products'
      targetUrl: 'http://product-service.com'
    - proxyPrefix: '/api/orders'
      targetUrl: 'http://order-service.com'
```


