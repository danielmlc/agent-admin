# Profiles 配置说明

## 配置文件结构

配置文件应该按以下结构组织：

```yaml
application:
  # 主配置（优先级最高）
  name: 'agent-admin'
  port: 3001
  
  # 激活的 profile（逗号分隔，后面的会覆盖前面的）
  profiles.active: 'local,dev'
  
  # 其他配置...

# Profile 配置（在 application 外面，与 application 平级）
profiles.local:
  log:
    level: 'debug'
  # local 环境特定的配置...

profiles.dev:
  log:
    level: 'info'
  # dev 环境特定的配置...
```

## 配置合并优先级

配置会按以下优先级合并（从高到低）：

1. **profiles.{激活的环境} 配置**（最高优先级，环境特定配置，可覆盖 application）
2. **application 下的配置**（中等优先级，通用配置）
3. **默认配置**（最低优先级）

**设计理念**：
- `application` 中放置所有环境通用的配置（如端口、应用名等）
- `profiles.xxx` 中放置环境特定的配置（如开发环境用 debug 日志，生产环境用 info 日志）
- `profiles` 配置会覆盖 `application` 中的同名配置，实现环境差异化

### 示例

假设有如下配置：

```yaml
application:
  name: 'my-app'
  port: 3001
  profiles.active: 'local,dev'
  log:
    level: 'warn'  # application 中的配置

profiles.local:
  log:
    level: 'debug'  # local profile 的配置
    dir: './logs'

profiles.dev:
  log:
    level: 'info'   # dev profile 的配置
    maxFiles: '30d'
```

最终合并结果：
```yaml
{
  name: 'my-app',
  port: 3001,
  log: {
    level: 'info',      # 来自 profiles.dev（优先级最高，覆盖了 local 和 application）
    dir: './logs',      # 来自 profiles.local
    maxFiles: '30d'     # 来自 profiles.dev
  }
}
```

**说明**：
- `log.level` 最终是 `'info'`，因为在 `profiles.active: 'local,dev'` 中，`dev` 在后面，会覆盖 `local` 的 `'debug'`
- `log.level` 不是 `'warn'`（application 中的值），因为 profiles 配置优先级更高

## 常见问题

### 1. profiles.active 位置

`profiles.active` 必须在 `application` 下，与其他应用配置平级：

✅ **正确**：
```yaml
application:
  name: 'app'
  profiles.active: 'local'
```

❌ **错误**：
```yaml
profiles.active: 'local'
application:
  name: 'app'
```

### 2. profiles 配置位置

`profiles.xxx` 必须在 `application` 外面，与 `application` 平级：

✅ **正确**：
```yaml
application:
  name: 'app'

profiles.local:
  log:
    level: 'debug'
```

❌ **错误**：
```yaml
application:
  name: 'app'
  profiles.local:
    log:
      level: 'debug'
```

### 3. YAML 缩进

YAML 对缩进非常敏感，必须使用空格（不能用 Tab），且缩进必须一致。

## 调试配置

如果配置没有生效，可以：

1. 检查配置文件格式是否正确
2. 检查 `profiles.active` 的值是否正确
3. 在代码中添加日志查看最终配置：
   ```typescript
   console.log('最终配置:', this.configService.getAll());
   ```

4. 检查文件名是否为 `config.yaml`（不是 `config.yml`）
