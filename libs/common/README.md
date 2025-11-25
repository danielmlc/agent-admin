# @app/common

NestJS 通用功能库，提供日志、上下文管理、HTTP客户端、加密工具、DTO基础类等核心功能。

## 功能特性

- ✅ **Logger** - 基于 Winston 的日志服务，支持文件轮转
- ✅ **Context** - 基于 AsyncLocalStorage 的请求上下文管理
- ✅ **HTTP** - 基于 Axios 的 HTTP 客户端服务
- ✅ **Utils** - 通用工具类（ID生成、加密解密、IP获取等）
- ✅ **DTO** - 基础 DTO 类、分页、查询条件、结果封装（支持 UUID 主键）
- ✅ **Constants** - HTTP 状态枚举和扩展状态码

## 安装依赖

该模块依赖以下包（已在根项目中安装）：

```bash
npm install winston winston-daily-rotate-file argon2 nanoid axios class-validator class-transformer uuid
npm install -D @types/uuid
```

## 快速开始

### 1. Logger 模块

日志服务，支持控制台和文件输出，自动按日期轮转。

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@app/common';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'debug',
      dirname: './logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
})
export class AppModule {}
```

使用日志服务：

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@app/common';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {}

  someMethod() {
    this.logger.log('这是一条日志');
    this.logger.error('这是一条错误日志', 'trace信息');
    this.logger.warn('这是一条警告');
    this.logger.debug('这是调试信息');
  }
}
```

### 2. Context 上下文模块

管理请求上下文，自动追踪用户信息、请求链路等。

```typescript
import { Module } from '@nestjs/common';
import { ContextModule } from '@app/common';

@Module({
  imports: [
    ContextModule.forRoot({
      enableCaching: true,
      cacheTTL: 300,
    }),
  ],
})
export class AppModule {}
```

使用上下文服务：

```typescript
import { Injectable } from '@nestjs/common';
import { ContextService } from '@app/common';

@Injectable()
export class UserService {
  constructor(private readonly contextService: ContextService) {}

  getCurrentUser() {
    const context = this.contextService.get();
    return {
      userId: context.userId,
      userName: context.userName,
      requestId: context.requestId,
    };
  }

  setUserInfo(userId: string, userName: string) {
    this.contextService.set({
      userId,
      userName,
    });
  }
}
```

### 3. HTTP 模块

基于 Axios 的 HTTP 客户端服务。

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@app/common';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      retries: 3,
    }),
  ],
})
export class AppModule {}
```

使用 HTTP 服务：

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@app/common';

@Injectable()
export class ApiService {
  constructor(private readonly httpService: HttpService) {}

  async fetchData() {
    const response = await this.httpService.get('https://api.example.com/data');
    return response.data;
  }

  async postData(data: any) {
    return await this.httpService.post('https://api.example.com/data', data);
  }
}
```

### 4. Utils 工具类

#### 加密工具

```typescript
import { CryptoUtil } from '@app/common';

// Argon2 密码哈希
const hash = await CryptoUtil.hashPassword('myPassword');
const isValid = await CryptoUtil.verifyPassword('myPassword', hash);

// AES 加密/解密
const encrypted = CryptoUtil.aesEncrypt('secret data', 'encryption-key');
const decrypted = CryptoUtil.aesDecrypt(encrypted, 'encryption-key');

// MD5 哈希
const md5Hash = CryptoUtil.md5('some text');
```

#### 通用工具

```typescript
import { CommonUtil } from '@app/common';

// 生成 UUID
const id = CommonUtil.generateUuid();

// 生成 NanoID
const nanoId = CommonUtil.generateNanoId();

// 获取 IP 地址
const ip = CommonUtil.getIPAddress();

// 获取 MAC 地址
const mac = CommonUtil.getMac();
```

### 5. DTO 基础类

#### 基础 DTO (支持 UUID 主键)

```typescript
import { HasPrimaryDto, QueryConditionInput, PageResult } from '@app/common';

// 实体 DTO (包含 id, createdAt, updatedAt)
export class UserDto extends HasPrimaryDto {
  name: string;
  email: string;
}

// 查询条件
const query: QueryConditionInput = {
  page: 1,
  pageSize: 10,
  keyword: 'search text',
  orderBy: 'createdAt',
  orderDirection: 'DESC',
};

// 分页结果
const result: PageResult<UserDto> = {
  items: [/* users */],
  total: 100,
  page: 1,
  pageSize: 10,
  totalPages: 10,
};
```

#### 响应结果封装

```typescript
import { Result, ErrorResult } from '@app/common';

// 成功响应
return Result.success(data, '操作成功');

// 错误响应
return ErrorResult.error('操作失败', 400);

// 分页响应
return Result.page(items, total, page, pageSize);
```

### 6. Constants 常量

```typescript
import { EHttpStatus, EHttpExtendStatus } from '@app/common';

// HTTP 状态
console.log(EHttpStatus.Success); // 'success'
console.log(EHttpStatus.Error);   // 'error'

// 扩展状态码
console.log(EHttpExtendStatus.INTERNAL_RPC_SERVER_ERROR);   // 508
console.log(EHttpExtendStatus.INTERNAL_RPC_SERVER_TIMEOUT); // 509
```

## API 文档

### LoggerService

- `log(message: string, context?: string)` - 记录普通日志
- `error(message: string, trace?: string, context?: string)` - 记录错误日志
- `warn(message: string, context?: string)` - 记录警告日志
- `debug(message: string, context?: string)` - 记录调试日志
- `verbose(message: string, context?: string)` - 记录详细日志

### ContextService

- `get()` - 获取当前请求上下文
- `set(context: Partial<UserContext>)` - 设置上下文信息
- `run(context: UserContext, callback: Function)` - 在指定上下文中运行回调

### HttpService

- `get<T>(url: string, config?: AxiosRequestConfig)` - GET 请求
- `post<T>(url: string, data?: any, config?: AxiosRequestConfig)` - POST 请求
- `put<T>(url: string, data?: any, config?: AxiosRequestConfig)` - PUT 请求
- `delete<T>(url: string, config?: AxiosRequestConfig)` - DELETE 请求

### CryptoUtil

- `hashPassword(password: string)` - Argon2 密码哈希
- `verifyPassword(password: string, hash: string)` - 验证密码
- `aesEncrypt(data: string, key: string)` - AES 加密
- `aesDecrypt(encrypted: string, key: string)` - AES 解密
- `md5(data: string)` - MD5 哈希

### CommonUtil

- `generateUuid()` - 生成 UUID
- `generateNanoId(size?: number)` - 生成 NanoID
- `getIPAddress()` - 获取本机 IP 地址
- `getMac()` - 获取 MAC 地址

## 项目结构

```
libs/common/
├── src/
│   ├── constants/          # 常量定义
│   ├── context/            # 上下文模块
│   ├── dto/                # DTO 基础类
│   ├── http/               # HTTP 模块
│   ├── interface/          # 接口定义
│   ├── logger/             # 日志模块
│   ├── utils/              # 工具类
│   └── index.ts            # 主入口
├── tsconfig.lib.json       # TypeScript 配置
└── README.md               # 文档
```

## 重要说明

### UUID 主键

所有 DTO 基础类中的 `id` 字段类型为 `string`，适配 UUID 主键：

```typescript
export class HasPrimaryDto {
  @ApiProperty({ description: 'ID' })
  id: string;  // UUID 类型

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
```

## License

MIT
