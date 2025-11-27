-- ============================================
-- 数据库初始化脚本
-- 用于初始化超级管理员账户
-- ============================================

-- 插入超级管理员账户
-- 注意：密码 'admin123' 已经过 Argon2 加密
-- 如果需要修改密码，请运行: npx ts-node scripts/generate-password.ts
INSERT INTO users (
  id,
  username,
  phone,
  email,
  passwordHash,
  nickname,
  avatar,
  status,
  created_at,
  modified_at,
  creator_id,
  creator_name,
  modifier_id,
  modifier_name,
  is_removed,
  version,
  sort_code,
  is_enable,
  last_login_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '18681801372',
  'malongchang@yearrow.com',
  '$argon2id$v=19$m=65536,t=3,p=4$L0uVpyL4PMPSmh6o7b378Q$mftesFl0IdyMOMp4nspQoQ4RXbRnppxJwNXFD0TaXO4',
  '超级管理员',
  '',
  'normal',
  datetime('now'),
  datetime('now'),
  'system',
  'System',
  'system',
  'System',
  0,
  1,
  0,
  1,
  NULL
)
ON CONFLICT(username) DO NOTHING;

-- ============================================
-- 默认账户信息
-- ============================================
-- 用户名: admin
-- 密码: admin123
-- 邮箱: malongchang@yearrow.com
-- 手机: 18681801372
-- ============================================
-- ⚠️ 重要提示：
-- 1. 首次登录后请立即修改默认密码
-- 2. 如需生成新的密码哈希，运行: npx ts-node scripts/generate-password.ts
-- ============================================

-- 使用方法：
-- 1. 确保数据库表已创建（运行 npm run start:dev 会自动创建表）
-- 2. 在 SQLite 客户端或应用程序中执行此 SQL 文件
-- 3. 或使用命令: sqlite3 data/database.sqlite < init-database.sql

-- 如果需要删除超级管理员重新创建，使用以下命令：
-- DELETE FROM users WHERE username = 'admin';
