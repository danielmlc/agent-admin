### @cs/nest-redis代码库源码整理

#### 代码目录
```
@cs/nest-redis/
├── src/
├── index.ts
├── redis.constants.ts
├── redis.interface.ts
├── redis.module.ts
└── redis.service.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-redis",
  "version": "2.0.0",
  "description": "> TODO: description",
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
    "ioredis": "^5.4.2",
    "lodash": "^4.17.21",
    "rxjs": "^7.8.1",
    "reflect-metadata": "^0.2.2"
  }
}




```


> 代码路径  `src\index.ts`

```typescript
export * from './redis.module';
export * from './redis.service';
export * from './redis.interface';

```


> 代码路径  `src\redis.constants.ts`

```typescript
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const REDIS_MODULE_OPTIONS = Symbol('REDIS_MODULE_OPTIONS');
export const REDIS_DEFAULT_CLIENT_KEY = 'default';

```


> 代码路径  `src\redis.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';
import { Redis, RedisOptions, ClusterNode, ClusterOptions } from 'ioredis';

export interface RedisModuleOptions extends RedisOptions {
  /**
   * muitl client connection, default
   */
  name?: string;

  /**
   * support url
   */
  url?: string;

  /**
   * is cluster
   */
  cluster?: boolean;

  /**
   * cluster node, using cluster is true
   */
  nodes?: ClusterNode[];

  /**
   * cluster options, using cluster is true
   */
  clusterOptions?: ClusterOptions;

  /**
   * callback
   */
  onClientReady?(client: Redis): void;
}

export interface RedisModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) =>
    | RedisModuleOptions
    | RedisModuleOptions[]
    | Promise<RedisModuleOptions>
    | Promise<RedisModuleOptions[]>;
  inject?: any[];
}

```


> 代码路径  `src\redis.module.ts`

```typescript
import {
  DynamicModule,
  Module,
  OnModuleDestroy,
  Provider,
} from '@nestjs/common';
import IORedis, { Redis, Cluster } from 'ioredis';
import { isEmpty } from 'lodash';
import { RedisService } from './redis.service';
import {
  REDIS_CLIENT,
  REDIS_DEFAULT_CLIENT_KEY,
  REDIS_MODULE_OPTIONS,
} from './redis.constants';
import { RedisModuleAsyncOptions, RedisModuleOptions } from './redis.interface';
@Module({})
export class RedisModule implements OnModuleDestroy {
  static forRoot(
    options: RedisModuleOptions | RedisModuleOptions[],
  ): DynamicModule {
    const clientProvider = this.createAysncProvider();
    return {
      module: RedisModule,
      providers: [
        clientProvider,
        {
          provide: REDIS_MODULE_OPTIONS,
          useValue: options,
        },
        RedisService,
      ],
      exports: [clientProvider, RedisService],
    };
  }

  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const clientProvider = this.createAysncProvider();
    return {
      module: RedisModule,
      imports: options.imports ?? [],
      providers: [
        clientProvider,
        this.createAsyncClientOptions(options),
        RedisService,
      ],
      exports: [clientProvider, RedisService],
    };
  }

  /**
   * create provider
   */
  private static createAysncProvider(): Provider {
    // create client
    return {
      provide: REDIS_CLIENT,
      useFactory: (
        options: RedisModuleOptions | RedisModuleOptions[],
      ): Map<string, Redis | Cluster> => {
        const clients = new Map<string, Redis | Cluster>();
        if (Array.isArray(options)) {
          options.forEach((op) => {
            const name = op.name ?? REDIS_DEFAULT_CLIENT_KEY;
            if (clients.has(name)) {
              throw new Error('Redis Init Error: name must unique');
            }
            clients.set(name, this.createClient(op));
          });
        } else {
          // not array
          clients.set(REDIS_DEFAULT_CLIENT_KEY, this.createClient(options));
        }
        return clients;
      },
      inject: [REDIS_MODULE_OPTIONS],
    };
  }

  /**
   * 创建IORedis实例
   */
  private static createClient(options: RedisModuleOptions): Redis | Cluster {
    const { onClientReady, url, cluster, clusterOptions, nodes, ...opts } =
      options;
    let client = null;
    // check url
    if (!isEmpty(url)) {
      client = new IORedis(url);
    } else if (cluster) {
      // check cluster
      client = new IORedis.Cluster(nodes, clusterOptions);
    } else {
      client = new IORedis(opts);
    }
    if (onClientReady) {
      onClientReady(client);
    }
    return client;
  }

  private static createAsyncClientOptions(options: RedisModuleAsyncOptions) {
    return {
      provide: REDIS_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject,
    };
  }

  // 当模块销毁时调用
  onModuleDestroy() {
    // on destroy
  }
}

```


> 代码路径  `src\redis.service.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { Cluster } from 'cluster';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, REDIS_DEFAULT_CLIENT_KEY } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly clients: Map<string, Redis | Cluster>,
  ) {}

  public getRedis(name = REDIS_DEFAULT_CLIENT_KEY): Redis {
    if (!this.clients.has(name)) {
      throw new Error(`redis client ${name} does not exist`);
    }
    return this.clients.get(name) as Redis;
  }
}

```


#### 代码说明

# @cs/nest-redis

一个用于 NestJS 的 Redis 客户端模块，基于 [ioredis](https://github.com/luin/ioredis) 构建，提供了完全的依赖注入支持和类型安全。

## 特性

- 🚀 **深度 NestJS 集成**：完全支持 NestJS 依赖注入和模块系统
- 💪 **类型安全**：基于 TypeScript 构建，提供完整的类型定义
- 🔄 **多实例支持**：支持配置多个命名的 Redis 连接
- ⚡ **高性能**：基于 ioredis，提供连接池和集群支持
- 🌐 **集群模式**：原生支持 Redis 集群配置
- 🔌 **灵活配置**：支持 URL 连接、标准配置和集群配置
- 🧩 **异步配置**：支持动态和异步模块配置
- 🔧 **框架无关**：核心服务可在任何 NestJS 应用中使用

## 安装

```bash
npm install @cs/nest-redis
# 或
yarn add @cs/nest-redis
# 或
pnpm add @cs/nest-redis
```


## 快速开始

### 1. 基础配置

```typescript
import { Module } from '@nestjs/common';
import { RedisModule } from '@cs/nest-redis';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'redis-password',
      db: 0,
    }),
  ],
})
export class AppModule {}
```


### 2. 使用 Redis 服务

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@cs/nest-redis';

@Injectable()
export class AppService {
  constructor(private readonly redisService: RedisService) {}

  async setKey(key: string, value: string): Promise<void> {
    const redis = this.redisService.getRedis();
    await redis.set(key, value);
  }

  async getKey(key: string): Promise<string | null> {
    const redis = this.redisService.getRedis();
    return redis.get(key);
  }
}
```

## 高级用法

### 多个 Redis 连接

```typescript
@Module({
  imports: [
    RedisModule.forRoot([
      {
        name: 'default',
        host: 'localhost',
        port: 6379,
      },
      {
        name: 'cache',
        host: 'cache-server',
        port: 6379,
        db: 1,
      },
      {
        name: 'session',
        host: 'session-server',
        port: 6379,
        db: 2,
      },
    ]),
  ],
})
export class AppModule {}

// 使用命名连接
@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  async cacheData(key: string, data: any): Promise<void> {
    const cacheRedis = this.redisService.getRedis('cache');
    await cacheRedis.set(key, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any> {
    const sessionRedis = this.redisService.getRedis('session');
    const session = await sessionRedis.get(`session:${sessionId}`);
    return session ? JSON.parse(session) : null;
  }
}
```

### Redis 集群配置

```typescript
@Module({
  imports: [
    RedisModule.forRoot({
      cluster: true,
      nodes: [
        { host: 'cluster-node1', port: 6379 },
        { host: 'cluster-node2', port: 6379 },
        { host: 'cluster-node3', port: 6379 },
      ],
      clusterOptions: {
        redisOptions: {
          password: 'cluster-password',
        },
        clusterRetryDelay: 300,
        clusterRetryAttempts: 3,
      },
    }),
  ],
})
export class AppModule {}
```

### 异步配置

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@cs/nest-config';
import { RedisModule } from '@cs/nest-redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFilePath: './config.yaml',
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => config.get('redis'),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## API 参考

### RedisModule

#### 静态方法

##### `forRoot(options: RedisModuleOptions | RedisModuleOptions[])`

同步配置 Redis 模块。

##### `forRootAsync(options: RedisModuleAsyncOptions)`

异步配置 Redis 模块。

### RedisService

#### 方法

##### `getRedis(name?: string): Redis`

获取 Redis 客户端实例。

参数：
- `name` - 客户端名称，默认为 'default'

返回：ioredis 客户端实例

### RedisModuleOptions

```typescript
interface RedisModuleOptions extends RedisOptions {
  name?: string;           // 连接名称，支持多实例
  url?: string;            // Redis URL 连接字符串
  cluster?: boolean;       // 是否为集群模式
  nodes?: ClusterNode[];   // 集群节点配置
  clusterOptions?: ClusterOptions; // 集群选项
  onClientReady?(client: Redis): void; // 客户端就绪回调
}
```

### RedisModuleAsyncOptions

```typescript
interface RedisModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => 
    RedisModuleOptions | 
    RedisModuleOptions[] | 
    Promise<RedisModuleOptions> | 
    Promise<RedisModuleOptions[]>;
  inject?: any[];
}
```


