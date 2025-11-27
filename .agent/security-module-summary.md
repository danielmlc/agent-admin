# 安全管理模块实现总结

## 功能概述
实现了一个完整的安全管理模块，包括：
1. **登录日志查看** - 使用表格展示用户的登录历史记录
2. **Token刷新记录** - 使用列表展示所有活跃的refresh token

## 前端实现

### 1. 路由配置
- 在 `Home.vue` 侧边栏添加了"安全管理"菜单项
- 在 `router.ts` 中添加了 `/security` 路由

### 2. 页面组件 (`views/Security.vue`)
包含两个标签页：

#### 登录日志标签页
- **搜索功能**：支持按登录状态（成功/失败）和登录方式（密码/短信/微信/GitHub）筛选
- **表格展示**：显示以下字段
  - 登录时间（可排序）
  - 登录方式（带标签）
  - 状态（成功/失败）
  - IP地址
  - 登录地点
  - 设备信息
  - 失败原因（仅失败时显示）
- **分页功能**：支持每页10/20/50/100条记录

#### Token刷新记录标签页
- **列表展示**：以卡片形式展示每个token
  - 设备图标（桌面/移动设备）
  - 设备名称（自动识别操作系统）
  - 当前设备标记
  - IP地址
  - 创建时间
  - 最后使用时间
  - 过期时间
- **操作功能**：
  - 刷新列表
  - 撤销单个Token
  - 撤销所有Token（会跳转到登录页）

### 3. API接口 (`api.ts`)
添加了4个新的API方法：
- `getLoginLogs()` - 获取登录日志
- `getRefreshTokens()` - 获取刷新Token列表
- `revokeRefreshToken()` - 撤销指定Token
- `revokeAllRefreshTokens()` - 撤销所有Token

## 后端实现

### 1. Controller (`auth.controller.ts`)
添加了4个新的端点：
- `GET /auth/login-logs` - 获取登录日志（支持分页和筛选）
- `GET /auth/refresh-tokens` - 获取刷新Token列表
- `DELETE /auth/refresh-tokens/:tokenId` - 撤销指定Token
- `DELETE /auth/refresh-tokens` - 撤销所有Token

### 2. Service (`auth.service.ts`)
实现了4个新方法：
- `getLoginLogs()` - 查询登录日志，支持按状态和登录方式筛选
- `getRefreshTokens()` - 查询用户的所有refresh token，并标记当前设备
- `revokeRefreshToken()` - 删除指定的refresh token
- `revokeAllRefreshTokens()` - 删除除当前token外的所有token

## 技术亮点

1. **智能设备识别**：根据UserAgent自动识别设备类型和操作系统
2. **当前设备标记**：通过最后使用时间判断当前正在使用的设备
3. **安全撤销**：撤销所有Token时保留当前设备的Token
4. **友好的UI**：
   - 登录日志使用表格，便于查看和筛选
   - Token记录使用卡片，更直观地展示设备信息
   - 当前设备有特殊标记和样式
5. **完整的错误处理**：所有操作都有适当的错误提示

## 依赖项
- `dayjs` - 用于日期时间格式化

## 使用说明
1. 登录系统后，点击侧边栏的"安全管理"菜单
2. 在"登录日志"标签页可以查看所有登录记录
3. 在"Token刷新记录"标签页可以管理所有登录设备
4. 如果发现异常登录，可以撤销对应设备的Token
