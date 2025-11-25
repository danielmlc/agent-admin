# Web 内容目录说明

## 目录结构

```
src/web-content/
├── pages/              # 页面组件
│   └── Login.vue      # 登录页面
├── utils/              # 工具函数
│   ├── request.ts     # axios 请求封装
│   └── api.ts         # API 接口定义
├── types/              # TypeScript 类型定义
│   └── global.d.ts    # 全局类型声明
├── login.ts            # 登录页面入口
├── login.html          # 登录页面 HTML 模板
├── App.vue             # 主应用组件
├── index.html          # 主应用 HTML 模板
└── router.ts           # 路由配置
```

## 登录页面功能

登录页面实现了三种登录方式：

### 1. 账号密码登录
- 输入用户名/邮箱和密码
- 需要输入图形验证码
- 支持"记住我"功能

### 2. 手机号登录
- 输入手机号
- 点击"获取验证码"发送短信验证码（需要先通过图形验证码验证）
- 输入短信验证码登录
- 60秒倒计时限制

### 3. 扫码登录
- 功能预留，暂未实现

### 第三方登录
- 微信登录（预留）
- GitHub 登录（预留）

## API 接口

所有接口定义在 `utils/api.ts` 中：

### 认证接口（authApi）
- `getCaptcha()` - 获取图形验证码
- `sendSmsCode(data)` - 发送短信验证码
- `loginByUsername(data)` - 账号密码登录
- `loginBySms(data)` - 手机号登录
- `refreshToken(data)` - 刷新令牌
- `logout()` - 登出
- `getProfile()` - 获取用户信息

### 用户接口（userApi）
- `getUserList(params)` - 获取用户列表
- `getUserById(id)` - 获取用户详情
- `createUser(data)` - 创建用户
- `updateUser(id, data)` - 更新用户
- `deleteUser(id)` - 删除用户

## 构建配置

在 `packer-config.ts` 中配置了登录页面的构建：

```javascript
entries: {
  login: {
    type: "browserVue3",
    title: "登录 - XXXXX管理系统",
    template: "src/web-content/login.html",
    input: "src/web-content/login.ts",
  }
}
```

## 开发和构建

### 开发模式
```bash
npm run start:dev
```
访问：http://localhost:4088/login.html

### 生产构建
```bash
npm run build
```
构建后的文件在 `dist/` 目录下

## Token 管理

- Access Token 存储在 `localStorage` 的 `access_token` 字段
- Refresh Token 存储在 `localStorage` 的 `refresh_token` 字段
- 自动刷新机制：当 API 返回 401 时，自动使用 refresh token 刷新 access token
- 刷新失败时自动跳转到登录页面

## 样式说明

- 使用 Element Plus 组件库（通过 CDN 引入）
- 使用 Less 预处理器编写样式
- 采用渐变背景和现代化 UI 设计
- 响应式布局，支持不同屏幕尺寸

## 注意事项

1. 所有第三方库（Vue、Element Plus、axios 等）通过 CDN 引入，不需要 npm 安装
2. 图形验证码是 SVG 格式，点击可刷新
3. 短信验证码发送前需要先通过图形验证码验证
4. 登录成功后会自动跳转到首页（/）
