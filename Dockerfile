# ===================================
# 阶段 1: 构建阶段
# ===================================
FROM node:20-alpine AS builder

# 安装编译依赖(better-sqlite3 需要)
RUN apk add --no-cache python3 make g++

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装所有依赖(包括 devDependencies)
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目(前端 + 后端)
RUN pnpm run build

# ===================================
# 阶段 2: 生产运行阶段
# ===================================
FROM node:20-alpine

# 安装运行时依赖(better-sqlite3 需要)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制 node_modules 和构建产物
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# 复制配置文件(Docker 环境配置)
COPY --chown=nodejs:nodejs config.docker.yaml ./config.yaml

# 创建数据目录(用于存放 SQLite 数据库)
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# 创建日志目录
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/controllers/main.js"]
