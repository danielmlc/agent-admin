# 配置管理模块实现总结

## 已完成功能

### 后端实现

#### 1. 数据库设计
采用**单一实体设计**，通过 `scope` 字段区分全局配置和用户配置：

**Config实体字段**：
- `scope`: 配置范围（global/user）
- `userId`: 用户ID（仅用户配置时有值）
- `group`: 配置分组（如：system, ui, notification等）
- `key`: 配置键
- `value`: 配置值（字符串存储）
- `valueType`: 值类型（string/number/boolean/json/array）
- `description`: 配置描述
- `isPublic`: 是否公开给前端
- `isEditable`: 是否允许用户自定义
- `defaultValue`: 默认值
- `sort`: 排序
- `groupName`: 分组名称

#### 2. API端点
**全局配置管理**：
- `GET /configs/global` - 获取全局配置列表
- `POST /configs/global` - 创建全局配置
- `PUT /configs/global/:id` - 更新全局配置
- `DELETE /configs/global/:id` - 删除全局配置

**用户配置管理**：
- `GET /configs/user` - 获取用户配置（合并全局配置）
- `GET /configs/user/:group/:key` - 获取单个配置
- `PUT /configs/user/:group/:key` - 设置用户配置
- `DELETE /configs/user/:group/:key` - 删除用户配置

**其他**：
- `GET /configs/public` - 获取公开配置
- `GET /configs/groups` - 获取配置组列表

#### 3. 核心特性
- ✅ 配置优先级：用户配置 > 全局配置 > 默认值
- ✅ 类型验证：自动验证配置值格式
- ✅ 类型转换：自动解析为对应类型
- ✅ Redis缓存：全局配置缓存1小时，用户配置缓存30分钟
- ✅ 缓存清理：配置更新时自动清除相关缓存

### 预设配置

已在 `scripts/init-configs.sql` 中预设了5个配置组：

1. **系统配置** (system)
   - 站点名称、Logo、版权信息、维护模式

2. **界面配置** (ui)
   - 主题、主题色、语言、时区、日期格式

3. **通知配置** (notification)
   - 邮件、短信、浏览器通知开关

4. **安全配置** (security)
   - 会话超时、密码强度、双因素认证

5. **隐私配置** (privacy)
   - 数据收集、Cookie同意

## 设计优势

### 单一实体设计的好处
1. **简化数据结构**：只需维护一张表
2. **统一查询逻辑**：全局和用户配置使用相同的查询方式
3. **易于扩展**：可以轻松添加新的scope类型
4. **减少JOIN操作**：提升查询性能

### 配置合并策略
```typescript
// 查询时自动合并
1. 先获取所有全局配置
2. 再获取用户配置
3. 用户配置覆盖同key的全局配置
4. 返回合并后的结果
```

## 下一步

需要完成前端页面：
1. 配置管理页面（管理员）- 管理全局配置
2. 个人设置页面（用户）- 管理个人配置

## 使用示例

### 后端使用
```typescript
// 注入ConfigService
constructor(private readonly configService: ConfigService) {}

// 获取用户配置
const configs = await this.configService.getUserConfigs(userId, 'ui');

// 设置用户配置
await this.configService.setUserConfig(userId, 'ui', 'theme', {
  value: 'dark',
  valueType: ConfigValueType.STRING
});
```

### 前端使用
```typescript
// 获取公开配置
const configs = await homeApi.getPublicConfigs();
// 返回格式: { ui: { theme: 'light', ... }, system: { ... } }

// 设置用户配置
await homeApi.setUserConfig('ui', 'theme', {
  value: 'dark',
  valueType: 'string'
});
```
