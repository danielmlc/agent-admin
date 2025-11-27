# GitHub OAuth 登录认证流程文档

## 目录

1. [概述](#概述)
2. [前置准备](#前置准备)
3. [完整流程图](#完整流程图)
4. [详细实现步骤](#详细实现步骤)
5. [核心代码说明](#核心代码说明)
6. [配置说明](#配置说明)
7. [数据库设计](#数据库设计)
8. [安全性考虑](#安全性考虑)
9. [常见问题](#常见问题)
10. [测试指南](#测试指南)

---

## 概述

本系统实现了基于 GitHub OAuth 2.0 的第三方登录功能,支持以下特性:

- ✅ 标准 OAuth 2.0 授权码流程
- ✅ 邮箱自动匹配已有用户
- ✅ OAuth 账号绑定管理
- ✅ JWT Token 认证
- ✅ 登录日志记录
- ✅ 配置化部署

### 技术栈

**后端:**
- NestJS - Web 框架
- Passport.js - 认证中间件
- passport-github2 - GitHub OAuth Strategy
- TypeORM - ORM 框架
- JWT - Token 认证

**前端:**
- Vue 3 - UI 框架
- Vue Router - 路由管理
- Element Plus - UI 组件库
- Axios - HTTP 客户端

---

## 前置准备

### 1. 创建 GitHub OAuth App

#### 步骤 1: 访问 GitHub Developer Settings
1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单滚动到底部,点击 **Developer settings**
4. 点击 **OAuth Apps** → **New OAuth App**

#### 步骤 2: 填写应用信息
- **Application name**: `Agent Admin (Development)`
- **Homepage URL**: `http://localhost:3001`
- **Authorization callback URL**: `http://localhost:3001/api/auth/oauth/github/callback`
- **Application description**: (可选) `Agent Admin 系统的 GitHub OAuth 登录`

#### 步骤 3: 获取凭证
创建后会看到:
- **Client ID**: 复制到 `config.yaml` 的 `oauth.github.clientId`
- **Client Secret**: 点击 "Generate a new client secret",复制到 `config.yaml` 的 `oauth.github.clientSecret`

⚠️ **注意**: Client Secret 只会显示一次,请妥善保存!

### 2. 配置文件设置

在 `config.yaml` 中配置 GitHub OAuth:

```yaml
oauth:
  github:
    clientId: 'your-github-client-id'
    clientSecret: 'your-github-client-secret'
    callbackUrl: 'http://localhost:3001/api/auth/oauth/github/callback'
    frontendCallbackUrl: 'http://localhost:3001/login.html#/oauth-callback'
    frontendLoginUrl: 'http://localhost:3001/login.html'
```

---

## 完整流程图

```
┌─────────┐                 ┌──────────┐                ┌─────────┐
│  用户   │                 │  前端    │                │  后端   │
└────┬────┘                 └────┬─────┘                └────┬────┘
     │                           │                           │
     │  1. 点击 GitHub 登录      │                           │
     ├──────────────────────────>│                           │
     │                           │                           │
     │                           │  2. 重定向到后端          │
     │                           ├──────────────────────────>│
     │                           │  GET /api/auth/oauth/github
     │                           │                           │
     │                           │                           │
     │  3. 重定向到 GitHub 授权页面                         │
     │<──────────────────────────┴───────────────────────────┤
     │  https://github.com/login/oauth/authorize?...        │
     │                                                        │
     │                                                        │
┌────▼────────────────────────────────────────────────────┐  │
│              GitHub 授权页面                             │  │
│  - 显示应用信息                                          │  │
│  - 请求权限: user:email                                  │  │
│  - 用户点击 Authorize                                    │  │
└────┬────────────────────────────────────────────────────┘  │
     │                                                        │
     │  4. GitHub 回调后端                                   │
     ├───────────────────────────────────────────────────────>│
     │  GET /api/auth/oauth/github/callback?code=xxx         │
     │                                                        │
     │                           ┌────────────────────────────┤
     │                           │  5. 后端处理:              │
     │                           │  - 使用 code 换取 access_token
     │                           │  - 获取用户 GitHub 信息    │
     │                           │  - 查找 OAuth 绑定         │
     │                           │  - 邮箱匹配/创建绑定       │
     │                           │  - 生成 JWT tokens         │
     │                           └────────────────────────────┤
     │                                                        │
     │  6. 重定向到前端回调页面                              │
     │<───────────────────────────────────────────────────────┤
     │  /login.html#/oauth-callback?accessToken=xxx&...      │
     │                           │                           │
     │                           │<──────────────────────────┤
     │                           │                           │
     │                           │  7. 前端处理:             │
     │                           │  - 从 URL 提取 tokens     │
     │                           │  - 保存到 localStorage    │
     │                           │  - 跳转到主页             │
     │                           │                           │
     │  8. 访问主页              │                           │
     │<──────────────────────────┤                           │
     │  /home.html               │                           │
     │                           │                           │
     │                           │  9. 请求用户数据          │
     │                           ├──────────────────────────>│
     │                           │  GET /api/xxx             │
     │                           │  Authorization: Bearer xxx│
     │                           │                           │
     │                           │  10. 验证 JWT 并返回数据  │
     │                           │<──────────────────────────┤
     │                           │                           │
     │  11. 显示页面内容         │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
```

---

## 详细实现步骤

### 第 1 步: 用户点击 GitHub 登录按钮

**文件**: `src/web-content/pages/login/Login.vue`

```vue
<el-button @click="handleGithubLogin" type="primary">
  <i class="fab fa-github"></i> GitHub 登录
</el-button>

<script>
const handleGithubLogin = () => {
  window.location.href = 'http://localhost:3001/api/auth/oauth/github'
}
</script>
```

### 第 2 步: 后端重定向到 GitHub 授权页面

**文件**: `src/controllers/modules/auth/auth.controller.ts`

```typescript
@Public()
@Get('oauth/github')
@UseGuards(AuthGuard('github'))
githubAuth () {
  // Passport 会自动重定向到 GitHub 授权页面
}
```

**文件**: `src/controllers/modules/auth/strategies/github.strategy.ts`

```typescript
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    const oauthConfig = configService.get('oauth.github');

    super({
      clientID: oauthConfig.clientId,
      clientSecret: oauthConfig.clientSecret,
      callbackURL: oauthConfig.callbackUrl,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GithubProfile> {
    return {
      provider: 'github',
      providerId: String(profile.id),
      username: profile.username || profile.displayName,
      email: profile.emails?.[0]?.value || null,
      avatar: profile.photos?.[0]?.value || null,
      accessToken,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        emails: profile.emails,
        photos: profile.photos,
      },
    };
  }
}
```

**重定向 URL 格式**:
```
https://github.com/login/oauth/authorize?
  response_type=code&
  redirect_uri=http://localhost:3001/api/auth/oauth/github/callback&
  scope=user:email&
  client_id=Ov23limJMcc5QqiHVnXI
```

### 第 3 步: 用户在 GitHub 授权页面同意授权

GitHub 会显示:
- 应用名称和描述
- 请求的权限(user:email)
- Authorize 按钮

### 第 4 步: GitHub 回调后端

GitHub 重定向到:
```
http://localhost:3001/api/auth/oauth/github/callback?code=xxx
```

### 第 5 步: 后端处理 OAuth 回调

**文件**: `src/controllers/modules/auth/auth.controller.ts`

```typescript
@Public()
@Get('oauth/github/callback')
@UseGuards(AuthGuard('github'))
async githubAuthCallback (
  @Req() req: any,
  @Res() res: Response,
  @Ip() ipAddress: string,
) {
  const oauthData = req.user; // 来自 GithubStrategy.validate

  // 从配置文件读取前端回调地址
  const oauthConfig = this.configService.get('oauth.github');

  try {
    // 调用 authService.loginByOAuth 处理登录
    const result = await this.authService.loginByOAuth(
      oauthData.provider,
      oauthData.providerId,
      oauthData.profile,
      oauthData.accessToken,
      ipAddress,
      req.headers['user-agent'] || '',
    );

    // 重定向回前端,并携带 token
    const redirectUrl = `${oauthConfig.frontendCallbackUrl}?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    // 登录失败,重定向回登录页并携带错误信息
    const errorMsg = encodeURIComponent(error.message || 'OAuth 登录失败');
    const redirectUrl = `${oauthConfig.frontendLoginUrl}/#/?error=${errorMsg}`;
    res.redirect(redirectUrl);
  }
}
```

**文件**: `src/controllers/modules/auth/auth.service.ts`

```typescript
async loginByOAuth (
  provider: string,
  providerId: string,
  profile: any,
  accessToken: string,
  ipAddress: string,
  userAgent: string,
) {
  // 1. 查找是否已有绑定
  const binding = await this.oauthBindingRepository.findOne({
    where: { provider, providerUserId: providerId },
    relations: ['user'],
  });

  let user: User;

  if (binding) {
    // 已绑定,直接登录
    user = binding.user;

    // 更新 OAuth binding 的 access token 和 profile
    binding.accessToken = accessToken;
    binding.profile = profile;
    await this.oauthBindingRepository.save(binding);
  } else {
    // 未绑定,检查 email 是否匹配已有用户
    // 从 emails 数组中提取 email,如果不存在则尝试直接读取 email 字段
    const email = profile.emails?.[0]?.value || profile.email;

    if (email) {
      const existingUser = await this.userService.findByEmail(email);

      if (existingUser) {
        // Email 匹配,自动绑定到现有用户
        user = existingUser;

        // 创建 OAuth 绑定
        const newBinding = this.oauthBindingRepository.create({
          userId: user.id,
          provider,
          providerUserId: providerId,
          providerUsername: profile.username || profile.displayName,
          accessToken,
          profile,
        });
        await this.oauthBindingRepository.save(newBinding);
      } else {
        // Email 不匹配且未绑定,提示需要先注册
        throw new UnauthorizedException(
          '该 GitHub 账号未绑定,请先注册账号或在已有账号中绑定 GitHub',
        );
      }
    } else {
      // 没有 email,无法自动匹配,提示需要先注册
      throw new UnauthorizedException(
        '该 GitHub 账号未绑定,请先注册账号或在已有账号中绑定 GitHub',
      );
    }
  }

  // 检查用户状态
  if (user.status !== 'normal') {
    await this.logLogin(
      user.id,
      LoginType.GITHUB,
      ipAddress,
      userAgent,
      LoginStatus.FAILED,
      '用户已被禁用或锁定',
    );
    throw new UnauthorizedException('用户已被禁用或锁定');
  }

  // 生成 Token
  const tokens = await this.generateTokens(user, ipAddress, userAgent);

  // 更新最后登录时间
  await this.userService.updateLastLoginAt(user.id);

  // 记录登录日志
  await this.logLogin(
    user.id,
    LoginType.GITHUB,
    ipAddress,
    userAgent,
    LoginStatus.SUCCESS,
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      nickname: user.nickname,
    },
    ...tokens,
  };
}
```

### 第 6-7 步: 前端接收 Token 并保存

**文件**: `src/web-content/pages/login/OAuthCallback.vue`

```vue
<template>
  <div class="oauth-callback-container">
    <div class="callback-card">
      <div class="loading-content" v-if="!error">
        <el-icon class="is-loading" :size="48" color="#409EFF">
          <Loading />
        </el-icon>
        <h2>正在登录...</h2>
        <p>请稍候,我们正在为您完成登录</p>
      </div>

      <div class="error-content" v-else>
        <el-icon :size="48" color="#F56C6C">
          <CircleClose />
        </el-icon>
        <h2>登录失败</h2>
        <p>{{ error }}</p>
        <el-button type="primary" @click="backToLogin">返回登录页</el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, CircleClose } from '@element-plus/icons-vue'

const router = useRouter()
const error = ref('')

onMounted(() => {
  // 从 URL 中获取 token
  const hash = window.location.hash
  const searchParams = new URLSearchParams(hash.split('?')[1])

  const accessToken = searchParams.get('accessToken')
  const refreshToken = searchParams.get('refreshToken')
  const errorMsg = searchParams.get('error')

  if (errorMsg) {
    // 登录失败
    error.value = decodeURIComponent(errorMsg)
    return
  }

  if (accessToken && refreshToken) {
    // 保存 token 到 localStorage
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    ElMessage.success('登录成功!')

    // 延迟跳转到首页
    setTimeout(() => {
      // 跳转到 home 页面
      window.location.href = '/home.html'
    }, 500)
  } else {
    error.value = '未能获取到登录凭证,请重新登录'
  }
})

const backToLogin = () => {
  window.location.href = '/login.html'
}
</script>
```

### 第 8-11 步: 访问受保护的 API

**文件**: `src/web-content/utils/request.ts`

```typescript
// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const { response, config } = error

    // 如果是 401 错误,尝试刷新 token
    if (response?.status === 401 && !config._retry) {
      config._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        // 刷新 token
        const res = await axios.post('/api/auth/refresh', {
          refreshToken
        })

        const newAccessToken = res.data.result.accessToken

        // 保存新的 token
        localStorage.setItem('access_token', newAccessToken)

        // 重试原请求
        config.headers.Authorization = `Bearer ${newAccessToken}`
        return request(config)
      } catch (err) {
        // 刷新失败,清除 token 并跳转到登录页
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login.html'
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)
```

---

## 核心代码说明

### 用户绑定策略

系统采用以下策略处理 GitHub 账号绑定:

1. **已绑定用户**: 如果 GitHub 账号已经绑定到某个用户,直接登录
2. **Email 匹配**: 如果 GitHub 的 email 与系统已有用户的 email 相同,自动绑定并登录
3. **未匹配**: 如果都不满足,提示用户先注册账号

```typescript
// 关键逻辑位置: auth.service.ts loginByOAuth 方法

// 1. 查找已有绑定
const binding = await this.oauthBindingRepository.findOne({
  where: { provider, providerUserId: providerId },
  relations: ['user'],
});

if (binding) {
  // 场景 1: 已绑定,直接使用
  user = binding.user;
} else {
  // 场景 2: 未绑定,尝试 email 匹配
  const email = profile.emails?.[0]?.value || profile.email;

  if (email) {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      // Email 匹配成功,自动绑定
      user = existingUser;
      // 创建新的 OAuth 绑定记录
      await this.oauthBindingRepository.save(newBinding);
    } else {
      // 场景 3: 无匹配,拒绝登录
      throw new UnauthorizedException('请先注册账号');
    }
  }
}
```

### Token 生成

系统生成两种 Token:

1. **Access Token** (短期,2小时): 用于 API 访问
2. **Refresh Token** (长期,7天): 用于刷新 Access Token

```typescript
// Access Token 结构
{
  sub: user.id,        // 用户 ID
  username: user.username,
  jti: nanoid(),       // 唯一标识符
  exp: ...             // 过期时间
}

// Refresh Token 结构
{
  sub: user.id,
  tokenId: nanoid(),
  exp: ...
}
```

---

## 配置说明

### config.yaml 完整配置

```yaml
# JWT 配置
jwt:
  accessTokenSecret: 'your-access-token-secret-key'
  accessTokenExpire: '2h'
  refreshTokenSecret: 'your-refresh-token-secret-key'
  refreshTokenExpire: '7d'

# OAuth 配置
oauth:
  github:
    # GitHub OAuth App 凭证
    clientId: 'your-github-client-id'
    clientSecret: 'your-github-client-secret'

    # 后端回调地址 (GitHub OAuth App 设置)
    callbackUrl: 'http://localhost:3001/api/auth/oauth/github/callback'

    # 前端回调地址 (登录成功后跳转)
    frontendCallbackUrl: 'http://localhost:3001/login.html#/oauth-callback'

    # 前端登录页地址 (登录失败后跳转)
    frontendLoginUrl: 'http://localhost:3001/login.html'
```

### 环境变量支持

可以通过环境变量覆盖配置:

```bash
# .env
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## 数据库设计

### oauth_bindings 表

存储用户与 OAuth 提供商的绑定关系:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar | 主键 |
| userId | varchar | 用户 ID (外键) |
| provider | varchar | 提供商 (github/wechat/...) |
| providerUserId | varchar | 提供商用户 ID |
| providerUsername | varchar | 提供商用户名 |
| accessToken | text | OAuth Access Token |
| profile | json | 用户完整信息 |
| createdAt | datetime | 创建时间 |
| modifiedAt | datetime | 修改时间 |

**索引**:
- `UNIQUE(provider, providerUserId)` - 确保同一提供商的同一用户只能绑定一次
- `INDEX(userId)` - 加速用户绑定查询

### refresh_tokens 表

存储 Refresh Token 信息:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar | Token ID (主键) |
| userId | varchar | 用户 ID (外键) |
| tokenHash | varchar | Token SHA256 哈希 |
| ipAddress | varchar | IP 地址 |
| userAgent | varchar | User Agent |
| deviceInfo | json | 设备信息 |
| expiresAt | datetime | 过期时间 |
| lastUsedAt | datetime | 最后使用时间 |
| createdAt | datetime | 创建时间 |

### login_logs 表

记录所有登录尝试:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar | 主键 |
| userId | varchar | 用户 ID |
| loginType | enum | 登录类型 (PASSWORD/SMS/GITHUB) |
| status | enum | 状态 (SUCCESS/FAILED) |
| ipAddress | varchar | IP 地址 |
| userAgent | varchar | User Agent |
| deviceInfo | json | 设备信息 |
| failureReason | varchar | 失败原因 |
| createdAt | datetime | 创建时间 |

---

## 安全性考虑

### 1. CSRF 防护

虽然当前实现较简单,建议增加 `state` 参数:

```typescript
// 生成随机 state
const state = crypto.randomBytes(32).toString('hex');
await redis.setex(`oauth:state:${state}`, 600, userId);

// 验证 state
const savedState = await redis.get(`oauth:state:${state}`);
if (!savedState) {
  throw new UnauthorizedException('Invalid state');
}
```

### 2. Token 安全

- **Access Token**: 短期有效,2小时过期
- **Refresh Token**:
  - 使用 SHA256 哈希存储在数据库
  - 支持撤销(删除数据库记录)
  - 记录使用时间和设备信息

### 3. OAuth Token 管理

- GitHub Access Token 加密存储在 `oauth_bindings.accessToken`
- 定期更新(每次登录时更新)
- 支持解绑(删除绑定记录)

### 4. 输入验证

- Email 格式验证
- Provider 白名单验证
- User Agent 长度限制

### 5. 审计日志

所有登录尝试(成功/失败)都记录在 `login_logs` 表:

```typescript
await this.logLogin(
  user.id,
  LoginType.GITHUB,
  ipAddress,
  userAgent,
  LoginStatus.SUCCESS,
);
```

---

## 常见问题

### Q1: GitHub 授权后显示 "redirect_uri_mismatch" 错误

**原因**: GitHub OAuth App 配置的回调 URL 与实际请求的不匹配

**解决方案**:
1. 检查 GitHub OAuth App 设置中的 "Authorization callback URL"
2. 确保与 `config.yaml` 中的 `oauth.github.callbackUrl` 完全一致
3. 注意 URL 末尾不要有多余的斜杠

### Q2: 登录成功但跳转后显示 401 错误

**原因**: localStorage 的 key 不匹配

**解决方案**:
确保以下位置使用相同的 key:
- 保存: `localStorage.setItem('access_token', token)`
- 读取: `localStorage.getItem('access_token')`

### Q3: "该 GitHub 账号未绑定" 错误

**原因**: GitHub 账号的 email 与系统中没有匹配的用户

**解决方案**:
1. 使用相同 email 先注册一个账号
2. 然后使用 GitHub 登录,系统会自动绑定

### Q4: Email 为空导致无法匹配

**原因**: GitHub 用户设置了邮箱隐私,API 无法获取 email

**解决方案**:
1. 在 GitHub 设置中取消 "Keep my email addresses private"
2. 或实现手动绑定功能,让用户在登录后手动关联账号

### Q5: 生产环境部署后无法登录

**原因**: 配置文件中的 URL 仍然是 localhost

**解决方案**:
更新 `config.yaml` 中所有 URL 为生产域名:
```yaml
oauth:
  github:
    callbackUrl: 'https://yourdomain.com/api/auth/oauth/github/callback'
    frontendCallbackUrl: 'https://yourdomain.com/login.html#/oauth-callback'
    frontendLoginUrl: 'https://yourdomain.com/login.html'
```

同时更新 GitHub OAuth App 的回调 URL。

---
