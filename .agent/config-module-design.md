# 配置管理模块设计文档

## 1. 功能概述

### 核心功能
- **双维度配置**：支持全局配置和用户级配置
- **多类型支持**：字符串、整数、布尔值、JSON对象、数组等
- **分组管理**：配置按组织结构分类管理
- **优先级机制**：用户配置优先于全局配置
- **缓存优化**：使用Redis缓存提升性能

## 2. 数据库设计

### 2.1 配置组表 (config_groups)
```sql
- id: UUID (主键)
- code: string (分组代码，唯一)
- name: string (分组名称)
- description: string (描述)
- sort: number (排序)
- status: enum (状态: active/inactive)
- createdAt, modifiedAt (时间戳)
```

### 2.2 全局配置表 (global_configs)
```sql
- id: UUID (主键)
- groupId: UUID (外键 -> config_groups)
- key: string (配置键，组内唯一)
- value: text (配置值，JSON字符串)
- valueType: enum (值类型: string/number/boolean/json/array)
- description: string (描述)
- isPublic: boolean (是否公开给前端)
- isEditable: boolean (是否可编辑)
- defaultValue: text (默认值)
- sort: number (排序)
- createdAt, modifiedAt (时间戳)
```

### 2.3 用户配置表 (user_configs)
```sql
- id: UUID (主键)
- userId: UUID (外键 -> users)
- groupId: UUID (外键 -> config_groups)
- key: string (配置键)
- value: text (配置值，JSON字符串)
- valueType: enum (值类型)
- createdAt, modifiedAt (时间戳)
- 唯一索引: (userId, groupId, key)
```

## 3. API设计

### 3.1 配置组管理
- `GET /configs/groups` - 获取配置组列表
- `POST /configs/groups` - 创建配置组
- `PUT /configs/groups/:id` - 更新配置组
- `DELETE /configs/groups/:id` - 删除配置组

### 3.2 全局配置管理
- `GET /configs/global` - 获取全局配置列表（支持按组筛选）
- `GET /configs/global/:key` - 获取单个全局配置
- `POST /configs/global` - 创建全局配置
- `PUT /configs/global/:id` - 更新全局配置
- `DELETE /configs/global/:id` - 删除全局配置

### 3.3 用户配置管理
- `GET /configs/user` - 获取当前用户配置（合并全局配置）
- `GET /configs/user/:key` - 获取单个用户配置
- `PUT /configs/user/:key` - 设置用户配置
- `DELETE /configs/user/:key` - 删除用户配置（恢复为全局配置）

### 3.4 配置获取（前端使用）
- `GET /configs/public` - 获取所有公开配置（全局+用户）

## 4. 前端页面设计

### 4.1 配置管理页面（管理员）
- 配置组管理（左侧树形结构）
- 全局配置列表（右侧表格）
- 配置编辑对话框（支持不同类型的输入）

### 4.2 个人配置页面（普通用户）
- 按组展示可配置项
- 显示当前值和默认值
- 支持重置为默认值

## 5. 技术实现要点

### 5.1 值类型处理
```typescript
enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array'
}
```

### 5.2 配置优先级
1. 用户配置（最高优先级）
2. 全局配置
3. 默认值

### 5.3 缓存策略
- 全局配置：缓存1小时
- 用户配置：缓存30分钟
- 配置更新时清除相关缓存

## 6. 预设配置组

### 系统配置 (system)
- 站点名称
- 站点Logo
- 备案信息
- 维护模式

### 通知配置 (notification)
- 邮件通知开关
- 短信通知开关
- 浏览器通知开关

### 界面配置 (ui)
- 主题色
- 语言
- 时区
- 日期格式

### 安全配置 (security)
- 会话超时时间
- 密码强度要求
- 双因素认证

### 隐私配置 (privacy)
- 数据收集
- Cookie设置
