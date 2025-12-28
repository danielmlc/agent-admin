# Agent Admin Docker 部署指南

本指南详细说明如何使用 Docker 和 Docker Compose 部署 Agent Admin 应用。

## 📋 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [构建镜像](#构建镜像)
- [运行容器](#运行容器)
- [数据持久化](#数据持久化)
- [环境变量](#环境变量)
- [健康检查](#健康检查)
- [日志管理](#日志管理)
- [故障排查](#故障排查)
- [生产部署建议](#生产部署建议)

---

## 📦 前置要求

- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0
- **系统要求**: 2GB RAM, 10GB 磁盘空间

检查版本:
```bash
docker --version
docker-compose --version
```

---

## 🚀 快速开始

### 1. 克隆项目(如果还没有)

```bash
git clone <your-repo-url>
cd agent-admin
```

### 2. 配置环境变量

复制环境变量模板并填写实际值:

```bash
cp .env.example .env
```

编辑 `.env` 文件,**必须修改**以下关键配置:

```env
# JWT 密钥(使用强随机字符串)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-me
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-me

# GitHub OAuth(如果使用)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 短信服务(如果使用)
SMS_ACCESS_KEY_ID=your-aliyun-access-key-id
SMS_ACCESS_KEY_SECRET=your-aliyun-access-key-secret
```

### 3. 创建数据目录

```bash
mkdir -p data logs
```

### 4. 启动服务

使用 Docker Compose 一键启动:

```bash
docker-compose up -d
```

### 5. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 只查看应用日志
docker-compose logs -f app

# 只查看 Redis 日志
docker-compose logs -f redis
```

### 6. 访问应用

- **前端登录页面**: http://localhost:3001/login.html
- **后台管理页面**: http://localhost:3001/home.html
- **API 文档**: http://localhost:3001/api/docs

---

## ⚙️ 配置说明

### 配置文件结构

项目支持两种配置方式:

1. **YAML 配置文件**: `config.docker.yaml` (容器内使用)
2. **环境变量**: `.env` 文件 (推荐用于敏感信息)

### 配置优先级

环境变量 > config.docker.yaml > 默认值

### 配置文件说明

| 文件 | 用途 | 说明 |
|------|------|------|
| `config.yaml` | 本地开发配置 | 不会打包到容器 |
| `config.docker.yaml` | Docker 容器配置 | 打包到容器,敏感信息用环境变量占位 |
| `.env` | 环境变量 | 存储敏感信息,不提交到 Git |
| `.env.example` | 环境变量模板 | 提供配置参考 |

---

## 🔨 构建镜像

### 使用 Docker Compose 构建

```bash
docker-compose build
```

### 手动构建

```bash
docker build -t agent-admin:latest .
```

### 构建参数说明

Dockerfile 采用**多阶段构建**:

1. **构建阶段** (builder):
   - 基于 `node:20-alpine`
   - 安装编译依赖(Python, make, g++)
   - 执行 `pnpm install` 和 `pnpm run build`
   - 编译 TypeScript 和前端资源

2. **运行阶段**:
   - 基于 `node:20-alpine`
   - 只复制必要的 node_modules 和 dist
   - 创建非 root 用户 `nodejs`
   - 暴露端口 3001

---

## 🏃 运行容器

### 使用 Docker Compose(推荐)

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps
```

### 手动运行容器

```bash
# 先启动 Redis
docker run -d \
  --name agent-admin-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine

# 再启动应用
docker run -d \
  --name agent-admin-app \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  --link agent-admin-redis:redis \
  agent-admin:latest
```

---

## 💾 数据持久化

### 持久化目录

| 容器内路径 | 主机路径 | 说明 |
|-----------|---------|------|
| `/app/data` | `./data` | SQLite 数据库文件 |
| `/app/logs` | `./logs` | 应用日志文件 |
| `redis:/data` | Docker Volume | Redis 数据 |

### 备份数据库

```bash
# 备份 SQLite 数据库
cp data/database.sqlite data/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# 或使用 docker cp
docker cp agent-admin-app:/app/data/database.sqlite ./backup/
```

### 恢复数据库

```bash
# 停止服务
docker-compose down

# 恢复数据库文件
cp backup/database.sqlite data/database.sqlite

# 重启服务
docker-compose up -d
```

---

## 🔐 环境变量

### 必填环境变量

```env
# JWT 密钥(必须修改)
JWT_ACCESS_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-random-string>
```

### GitHub OAuth 变量

```env
GITHUB_CLIENT_ID=<your-github-oauth-app-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-app-secret>
GITHUB_CALLBACK_URL=http://your-domain.com/api/auth/oauth/github/callback
GITHUB_FRONTEND_CALLBACK=http://your-domain.com/login.html#/oauth-callback
GITHUB_FRONTEND_LOGIN=http://your-domain.com/login.html
```

### 短信服务变量

```env
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=<aliyun-access-key>
SMS_ACCESS_KEY_SECRET=<aliyun-access-secret>
SMS_SIGN_NAME=<your-sms-signature>
SMS_TEMPLATE_CODE=SMS_xxxxxxx
```

### Redis 变量

```env
REDIS_HOST=redis  # Docker Compose 服务名
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=   # 可选
```

---

## 🩺 健康检查

### 应用健康检查

Docker 已配置自动健康检查:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', ...)"
```

### 手动检查健康状态

```bash
# 检查容器健康状态
docker inspect --format='{{.State.Health.Status}}' agent-admin-app

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' agent-admin-app | jq
```

### 添加健康检查端点

在 `app.controller.ts` 中添加:

```typescript
@Get('health')
@Public()
getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
```

---

## 📊 日志管理

### 查看 Docker 日志

```bash
# 实时查看日志
docker-compose logs -f app

# 查看最近 100 行
docker-compose logs --tail=100 app

# 查看带时间戳的日志
docker-compose logs -t app
```

### 查看应用日志文件

应用日志写入 `./logs` 目录:

```bash
# 查看应用日志
tail -f logs/app-*.log

# 查看错误日志
tail -f logs/error-*.log
```

### 日志轮转

应用使用 `winston-daily-rotate-file`,自动按天轮转日志:

- 保留时间: 30 天(在 `config.docker.yaml` 中配置)
- 文件命名: `app-YYYY-MM-DD.log`

---

## 🔧 故障排查

### 1. 容器无法启动

```bash
# 查看容器日志
docker-compose logs app

# 查看详细错误
docker logs agent-admin-app

# 检查容器状态
docker ps -a
```

### 2. 数据库连接失败

检查数据目录权限:

```bash
# 确保数据目录存在且可写
ls -la data/

# 修复权限
chmod -R 755 data/
```

### 3. Redis 连接失败

```bash
# 检查 Redis 是否运行
docker-compose ps redis

# 测试 Redis 连接
docker exec -it agent-admin-redis redis-cli ping

# 检查网络连接
docker-compose exec app ping redis
```

### 4. 端口占用

```bash
# Windows 查看端口占用
netstat -ano | findstr :3001

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3002:3001"  # 改为其他端口
```

### 5. 构建失败

```bash
# 清理 Docker 缓存
docker-compose build --no-cache

# 清理所有未使用的资源
docker system prune -a
```

---

## 🌐 生产部署建议

### 1. 使用 HTTPS

配置 Nginx 反向代理:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 使用外部 Redis

修改 `.env`:

```env
REDIS_HOST=your-redis-server.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

### 3. 配置 CORS

修改 `config.docker.yaml`:

```yaml
cors:
  origin: 'https://your-domain.com'
  credentials: true
```

### 4. 启用生产日志

```env
NODE_ENV=production
LOG_LEVEL=warn
```

### 5. 定期备份

设置定时任务:

```bash
# 添加到 crontab
0 2 * * * cp /path/to/data/database.sqlite /path/to/backup/database.sqlite.$(date +\%Y\%m\%d)
```

### 6. 监控和告警

使用 Prometheus + Grafana 监控容器:

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 7. 使用 Docker Secrets(Docker Swarm)

```bash
# 创建 secret
echo "your-secret-key" | docker secret create jwt_access_secret -

# 在 docker-compose.yml 中引用
secrets:
  - jwt_access_secret
```

---

## 🎯 常用命令速查

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart app

# 查看日志
docker-compose logs -f app

# 进入容器
docker-compose exec app sh

# 重新构建
docker-compose build --no-cache app

# 查看资源使用
docker stats agent-admin-app

# 清理未使用的镜像
docker image prune -a

# 备份数据库
docker cp agent-admin-app:/app/data/database.sqlite ./backup/

# 查看环境变量
docker-compose config
```

---

## 📞 获取帮助

如果遇到问题:

1. 查看日志: `docker-compose logs -f`
2. 检查健康状态: `docker-compose ps`
3. 查看环境变量: `docker-compose exec app env`
4. 进入容器调试: `docker-compose exec app sh`

---

## 📝 更新日志

- **v1.0.0**: 初始 Docker 化配置
  - 多阶段构建优化镜像大小
  - Docker Compose 编排应用和 Redis
  - 环境变量配置支持
  - 数据持久化配置
  - 健康检查配置

---

**祝部署顺利! 🎉**
