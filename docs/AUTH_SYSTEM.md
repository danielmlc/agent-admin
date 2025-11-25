# 智能体后台登录认证系统使用文档

## 📖 概述

本项目实现了一套完整的登录认证体系，支持以下功能：
- ✅ 用户名密码登录
- ✅ 手机验证码登录
- ✅ 第三方登录（微信、GitHub）预留接口
- ✅ JWT 双令牌机制（Access Token + Refresh Token）
- ✅ 设备管理
- ✅ 完善的安全机制

---

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16
- Redis >= 5.0
- SQLite（自动创建）

### 2. 配置文件

修改 `config.yaml` 中的配置：

```yaml
# JWT 密钥（生产环境务必修改）
jwt:
  accessTokenSecret: 'your-access-token-secret-change-in-production'
  accessTokenExpire: '2h'
  refreshTokenSecret: 'your-refresh-token-secret-change-in-production'
  refreshTokenExpire: '7d'

# Redis 配置
redis:
  host: 'localhost'
  port: 6379
  db: 0
  password: ''

# 短信配置（阿里云）
sms:
  provider: 'aliyun'
  accessKeyId: 'your-aliyun-access-key-id'
  accessKeySecret: 'your-aliyun-access-key-secret'
  signName: '智能体后台'
  templateCode: 'SMS_123456'
```

### 3. 启动服务

```bash
# 安装依赖
npm install

# 启动 Redis
redis-server

# 启动开发服务
npm run start:dev
```

服务将运行在 `http://localhost:3001`

---

## 🔑 API 接口文档

### 1. 获取图形验证码

```http
GET /api/auth/captcha
```

**响应示例：**
```json
{
  "id": "uuid-string",
  "image": "<svg>...</svg>"
}
```

### 2. 发送短信验证码

```http
POST /api/auth/send-sms-code
Content-Type: application/json

{
  "phone": "13800138000",
  "captchaId": "uuid-from-step-1",
  "captchaCode": "abcd"
}
```

**限制：**
- 60秒内只能发送一次
- 每日最多发送5次

### 3. 用户名密码登录

```http
POST /api/auth/login/username
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "captchaId": "uuid",
  "captchaCode": "abcd"
}
```

**响应示例：**
```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "phone": null,
    "email": null,
    "avatar": null,
    "nickname": "测试用户"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 604800
}
```

### 4. 手机验证码登录

```http
POST /api/auth/login/sms
Content-Type: application/json

{
  "phone": "13800138000",
  "smsCode": "123456"
}
```

**注意：** 首次登录会自动注册用户

### 5. 刷新 Access Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

**响应示例：**
```json
{
  "accessToken": "new-access-token",
  "tokenType": "Bearer"
}
```

### 6. 登出

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

### 7. 获取当前用户信息

```http
GET /api/auth/profile
Authorization: Bearer {accessToken}
```

### 8. 获取登录设备列表

```http
GET /api/devices
Authorization: Bearer {accessToken}
```

**响应示例：**
```json
[
  {
    "id": "device-uuid",
    "deviceInfo": {
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "127.0.0.1"
    },
    "ipAddress": "127.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastUsedAt": "2025-01-01T12:00:00.000Z",
    "expiresAt": "2025-01-08T00:00:00.000Z"
  }
]
```

### 9. 删除登录设备

```http
DELETE /api/devices/{deviceId}
Authorization: Bearer {accessToken}
```

---

## 🗄️ 数据库结构

### users 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | String | 用户名（唯一） |
| phone | String | 手机号（唯一） |
| email | String | 邮箱（唯一） |
| passwordHash | String | 密码哈希 |
| avatar | String | 头像 URL |
| nickname | String | 昵称 |
| status | Enum | 状态：normal/disabled/locked |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| lastLoginAt | DateTime | 最后登录时间 |

### oauth_bindings 第三方绑定表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID | 用户ID |
| provider | Enum | 提供商：wechat/github |
| providerUserId | String | 第三方用户ID |
| providerUsername | String | 第三方用户名 |
| accessToken | String | 第三方访问令牌 |
| profile | JSON | 第三方用户信息 |

### refresh_tokens 刷新令牌表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键（tokenId） |
| userId | UUID | 用户ID |
| tokenHash | String | 令牌哈希值（唯一） |
| deviceInfo | JSON | 设备信息 |
| ipAddress | String | IP地址 |
| userAgent | String | User Agent |
| expiresAt | DateTime | 过期时间 |
| createdAt | DateTime | 创建时间 |
| lastUsedAt | DateTime | 最后使用时间 |

### login_logs 登录日志表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID | 用户ID（可为空） |
| loginType | Enum | 登录方式 |
| ipAddress | String | IP地址 |
| userAgent | String | User Agent |
| deviceInfo | JSON | 设备信息 |
| location | String | 地理位置 |
| status | Enum | 状态：success/failed |
| failureReason | String | 失败原因 |
| createdAt | DateTime | 创建时间 |

### ip_rules IP 规则表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ipAddress | String | IP地址 |
| ruleType | Enum | 规则类型：whitelist/blacklist |
| reason | String | 原因 |
| createdBy | String | 创建者 |
| expiresAt | DateTime | 过期时间 |
| createdAt | DateTime | 创建时间 |

---

## 🔐 安全机制

### 1. 密码加密
- 使用 **Argon2** 算法进行密码哈希
- 防彩虹表攻击
- 自动检测并重新哈希过时的密码

### 2. 登录失败限制
- 同一用户名/手机号 + IP 组合
- 5次失败后锁定10分钟
- Redis 存储，过期自动清除

### 3. Token 管理
- Access Token：2小时有效期
- Refresh Token：7天有效期
- 登出后 Access Token 加入黑名单
- Refresh Token 存储在数据库，可撤销

### 4. 验证码机制
- 图形验证码：2分钟有效期
- 短信验证码：5分钟有效期
- 防止暴力破解

### 5. IP 黑白名单
- 支持 CIDR 范围匹配
- Redis 缓存提高性能
- 可设置过期时间

---

## 📝 使用示例

### 完整的登录流程（用户名密码）

```javascript
// 1. 获取图形验证码
const captchaRes = await fetch('http://localhost:3001/api/auth/captcha');
const { id: captchaId, image } = await captchaRes.json();

// 显示图形验证码图片
// 用户输入验证码: userInputCode

// 2. 登录
const loginRes = await fetch('http://localhost:3001/api/auth/login/username', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    password: 'password123',
    captchaId,
    captchaCode: userInputCode
  })
});

const { accessToken, refreshToken, user } = await loginRes.json();

// 3. 使用 Access Token 访问受保护的接口
const profileRes = await fetch('http://localhost:3001/api/auth/profile', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 4. Token 过期后刷新
const refreshRes = await fetch('http://localhost:3001/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newAccessToken } = await refreshRes.json();
```

### 手机验证码登录流程

```javascript
// 1. 获取图形验证码
const captchaRes = await fetch('http://localhost:3001/api/auth/captcha');
const { id: captchaId, image } = await captchaRes.json();

// 2. 发送短信验证码
await fetch('http://localhost:3001/api/auth/send-sms-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '13800138000',
    captchaId,
    captchaCode: userInputCode
  })
});

// 3. 用户输入收到的短信验证码，然后登录
const loginRes = await fetch('http://localhost:3001/api/auth/login/sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '13800138000',
    smsCode: '123456'
  })
});

const { accessToken, refreshToken, user } = await loginRes.json();
```

---

## ⚙️ 配置说明

### 安全配置

```yaml
security:
  loginFailLimit: 5           # 登录失败次数限制
  loginFailLockTime: 600      # 锁定时间（秒）
  smsCodeExpire: 300          # 短信验证码有效期（秒）
  smsCodeInterval: 60         # 短信发送间隔（秒）
  smsDailyLimit: 5            # 每日短信发送次数限制
  captchaExpire: 120          # 图形验证码有效期（秒）
```

---

## 🚧 TODO（未来扩展）

- [ ] 实现微信登录策略
- [ ] 实现 GitHub 登录策略
- [ ] 添加邮箱验证功能
- [ ] 实现"踢出其他设备"功能
- [ ] 添加登录地理位置解析
- [ ] 实现手机号/邮箱绑定与解绑
- [ ] 添加密码重置功能
- [ ] 实现 2FA 双因素认证

---

## 📌 注意事项

1. **生产环境部署前必须修改：**
   - JWT 密钥（accessTokenSecret 和 refreshTokenSecret）
   - Redis 密码
   - 阿里云短信配置

2. **SQLite 数据库文件：**
   - 默认存储在 `./data/database.sqlite`
   - 首次启动会自动创建
   - 建议定期备份

3. **短信服务：**
   - 需要在阿里云配置短信模板
   - 模板中需要包含 `{code}` 变量
   - 测试环境可以暂时不配置，会跳过短信发送

4. **Redis 必须启动：**
   - 验证码、限流等功能依赖 Redis
   - 未启动 Redis 会导致相关功能报错

---

## 🛠️ 故障排查

### 问题1：编译错误
```bash
npm run build
```
确保所有依赖已安装，TypeScript 路径别名配置正确。

### 问题2：Redis 连接失败
检查 Redis 是否启动：
```bash
redis-cli ping
# 应返回 PONG
```

### 问题3：短信发送失败
- 检查阿里云配置是否正确
- 检查短信模板是否已审核通过
- 检查账户余额是否充足

---

## 📧 联系方式

如有问题，请提交 Issue 或联系开发者。
