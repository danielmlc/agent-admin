# Common 库 Bootstrap 功能使用指南

## 概述

`@app/common` 库提供了一个强大的 `bootstrap` 方法，可以根据配置文件自动初始化和配置 NestJS 应用。这个方法实现了策略模式，根据配置文件中的设置自动应用各种配置策略。

## 快速开始

### 1. 更新 main.ts

使用 `bootstrap` 方法替换传统的 NestJS 启动方式：

```typescript
import { AppModule } from './app.module';
import { bootstrap } from '@app/common';
import { ConfigService } from '@app/config';

bootstrap(AppModule, async (app, configService: ConfigService) => {
  // 在这里可以添加自定义的启动逻辑
  console.log('应用启动完成！');
});
```

### 2. 配置文件设置

在 `config.yaml` 中配置各个策略：

```yaml
name: 'my-app'
port: 3000
env: 'dev'

# 启用日志策略
logger: true

# 启用中间件策略
middlewareStrategy: true
contextMiddleware: true

# 启用拦截器策略
interceptorsStrategy: true
loggerInterceptor:
  moreInfo: false

transformInterceptor: true

# 启用管道策略
pipesStrategy: true
validationPipe:
  transform: true
  whitelist: true

# 启用过滤器策略
filterStrategy: true
exceptionFilter:
  stack:
    response: false
    logger: true

# 启用启动策略
started: true
```

## 配置策略详解

### 1. Logger Strategy (日志策略)

**配置键**: `logger`

**功能**:
- 设置应用使用自定义 Logger
- 可选择性禁用 console 输出

**配置示例**:
```yaml
logger: true
disableConsole: false  # 生产环境可设为 true
```

### 2. Middleware Strategy (中间件策略)

**配置键**: `middlewareStrategy`

**功能**:
- CORS 配置
- 上下文中间件（为每个请求创建独立上下文）

**配置示例**:
```yaml
middlewareStrategy: true

# CORS 配置
cors:
  origin: true
  credentials: true

# 上下文中间件
contextMiddleware: true
```

### 3. Interceptors Strategy (拦截器策略)

**配置键**: `interceptorsStrategy`

**功能**:
- 请求日志拦截器：记录所有请求和响应
- 响应转换拦截器：将返回数据包装成统一格式

**配置示例**:
```yaml
interceptorsStrategy: true

# 日志拦截器配置
loggerInterceptor:
  moreInfo: true  # 是否记录详细信息（headers, body等）

# 响应转换拦截器
transformInterceptor: true
```

**响应格式**:
```json
{
  "code": 200,
  "status": "success",
  "message": "",
  "result": {
    // 你的数据
  }
}
```

**跳过转换**:
使用装饰器跳过某个接口的响应转换：
```typescript
import { skipTransformInterceptor } from '@app/common';

@Get('raw')
@skipTransformInterceptor()
getRawData() {
  return { raw: 'data' };
}
```

### 4. Pipes Strategy (管道策略)

**配置键**: `pipesStrategy`

**功能**:
- 全局参数验证
- 自动类型转换

**配置示例**:
```yaml
pipesStrategy: true

validationPipe:
  transform: true              # 自动类型转换
  whitelist: true              # 移除未定义的属性
  forbidNonWhitelisted: false  # 是否拒绝未定义的属性
```

### 5. Filter Strategy (过滤器策略)

**配置键**: `filterStrategy`

**功能**:
- 统一异常处理
- 错误日志记录
- 错误响应格式化

**配置示例**:
```yaml
filterStrategy: true

exceptionFilter:
  stack:
    response: false  # 是否在响应中包含堆栈信息（生产环境建议 false）
    logger: true     # 是否在日志中包含堆栈信息
```

**错误响应格式**:
```json
{
  "code": 500,
  "message": "Internal server error",
  "path": "/api/test",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "stack": "..."  // 仅在 response: true 时返回
}
```

### 6. Started Strategy (启动策略)

**配置键**: `started`

**功能**:
- 启动 HTTP 服务器
- 打印启动信息
- 设置全局路由前缀

**配置示例**:
```yaml
started: true
serverPath: 'api'  # 设置全局路由前缀，如 http://localhost:3000/api/...
```

## Components 组件

### 装饰器

#### @skipTransformInterceptor()

跳过响应转换拦截器

```typescript
import { skipTransformInterceptor } from '@app/common';

@Get('html')
@skipTransformInterceptor()
getHtml() {
  return '<html>...</html>';
}
```

### 中间件

#### ContextMiddleware

为每个请求创建独立的上下文，存储请求相关信息

```typescript
import { ContextService } from '@app/common';

@Injectable()
export class MyService {
  constructor(private contextService: ContextService) {}

  doSomething() {
    const requestId = this.contextService.getContext<string>('requestId');
    console.log('当前请求ID:', requestId);
  }
}
```

### 拦截器

#### LoggingInterceptor

记录所有请求和响应的详细信息

#### TransformInterceptor

将返回数据包装成统一的响应格式

### 过滤器

#### UnifiedExceptionFilter

统一处理所有异常，返回标准化的错误响应

## 自定义策略

你可以创建自己的配置策略：

```typescript
import { SetupStrategy } from '@app/common';

export class MyCustomStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 检查配置
    if (this.configService.isConfig('myCustomFeature')) {
      const config = this.configService.get('myCustomFeature');
      // 实现你的逻辑
      console.log('自定义策略已加载', config);
    }
  }
}
```

然后在 `libs/common/src/setup/index.ts` 中注册：

```typescript
export const configStrategyMap = {
  // ... 其他策略
  myCustomStrategy: MyCustomStrategy,
};
```

配置文件中添加：

```yaml
myCustomStrategy: true
myCustomFeature:
  option1: value1
  option2: value2
```

## 完整示例

查看 `config.example.yaml` 获取完整的配置示例。

## 注意事项

1. 配置策略的执行顺序是固定的，参见 `configStrategyMap` 的定义顺序
2. `started` 策略必须放在最后执行，因为它会启动 HTTP 服务器
3. 在生产环境中，建议设置 `exceptionFilter.stack.response: false` 以避免泄露敏感信息
4. 使用 `loggerInterceptor.moreInfo: true` 会记录请求体和响应体，可能影响性能
