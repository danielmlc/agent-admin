# @app/config

NestJS 本地配置管理模块，支持多套配置、YAML 格式、配置合并等功能。

## 功能特性

- ✅ 本地 YAML 配置文件加载
- ✅ 多套配置支持（通过 `profiles.active` 切换）
- ✅ 深度配置合并（使用 lodash.defaultsDeep）
- ✅ 环境变量覆盖
- ✅ 类型安全的配置访问
- ✅ 同步和异步模块注册

## 项目依赖

该模块依赖以下包（已在根项目中安装）：

```bash
npm install js-yaml lodash
npm install -D @types/js-yaml @types/lodash
```

## 快速开始

### 1. 创建配置文件

在项目根目录创建 `config.yaml` 文件：

```yaml
application:
  name: 'my-app'
  port: 3000
  env: 'dev'
  profiles.active: 'dev,local'  # 多个环境用逗号分隔

  database:
    host: 'localhost'
    port: 3306

# 开发环境配置
profiles.dev:
  database:
    host: 'dev-db.example.com'
    username: 'dev_user'

# 本地环境配置（优先级更高）
profiles.local:
  database:
    host: 'localhost'
    password: 'local_pass'
```

### 2. 注册模块

在 `app.module.ts` 中导入配置模块：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      configFilePath: './config.yaml',  // 可选，默认为 './config.yaml'
      isGlobal: true,                    // 可选，默认为 true
    }),
  ],
})
export class AppModule {}
```

### 3. 使用配置

在任意服务中注入 `ConfigService`：

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@app/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getAppInfo() {
    const appName = this.configService.get<string>('name');
    const port = this.configService.get<number>('port');
    const dbHost = this.configService.get<string>('database.host');

    return { appName, port, dbHost };
  }

  checkConfig() {
    if (this.configService.has('database.host')) {
      console.log('数据库配置存在');
    }
  }

  getAllConfig() {
    return this.configService.getAll();
  }
}
```

## 配置合并规则

配置按以下优先级合并（从高到低）：

```
1. application 配置（最高优先级）
2. profiles.{env} 配置（按 profiles.active 顺序，右边优先级更高）
3. 默认配置（最低优先级）
```

### 示例

```yaml
application:
  name: 'my-app'
  port: 3000
  profiles.active: 'dev,local'

  database:
    host: 'default-host'
    port: 3306

profiles.dev:
  database:
    host: 'dev-host'
    username: 'dev_user'

profiles.local:
  database:
    password: 'local_pass'
```

最终合并结果：

```javascript
{
  name: 'my-app',           // 来自 application
  port: 3000,               // 来自 application
  database: {
    host: 'default-host',   // 来自 application（优先级最高）
    port: 3306,             // 来自 application
    username: 'dev_user',   // 来自 profiles.dev
    password: 'local_pass', // 来自 profiles.local
  }
}
```

## 环境变量支持

可以通过环境变量覆盖配置：

- `APP_NAME` - 应用名称
- `APP_PORT` - 应用端口
- `APP_ENV` - 环境
- `APP_SERVER_PATH` - 服务路径
- `PROFILES_ACTIVE` - 激活的配置文件

```bash
# 通过环境变量覆盖配置
APP_PORT=8080 PROFILES_ACTIVE=prod npm start
```

## 异步注册

如果需要异步加载配置（例如从数据库或远程服务加载）：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';

@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => {
        // 异步加载配置
        const config = await fetchConfigFromRemote();
        return config;
      },
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## API 文档

### ConfigService

#### `get<T>(key: string, defaultValue?: T): T`

获取配置值，支持点号分隔的嵌套路径。

```typescript
configService.get<string>('database.host');
configService.get<number>('port', 3000);  // 带默认值
```

#### `has(key: string): boolean`

检查配置键是否存在。

```typescript
if (configService.has('database.host')) {
  // 配置存在
}
```

#### `getAll(): ConfigSchema`

获取所有配置。

```typescript
const allConfig = configService.getAll();
```

## 配置文件结构

```typescript
interface YamlConfigSchema {
  application: {
    name?: string;
    port?: number;
    serverPath?: string;
    env?: string;
    'profiles.active'?: string;
    [key: string]: any;  // 支持任意自定义配置
  };
  [key: string]: any;  // 支持 profiles.xxx 配置
}
```

## License

MIT
