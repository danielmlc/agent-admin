-- 配置表
CREATE TABLE IF NOT EXISTS configs (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global',
  userId TEXT,
  `group` TEXT NOT NULL,
  `key` TEXT NOT NULL,
  value TEXT NOT NULL,
  valueType TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  isPublic INTEGER NOT NULL DEFAULT 0,
  isEditable INTEGER NOT NULL DEFAULT 1,
  defaultValue TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  groupName TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creatorId TEXT,
  creatorName TEXT,
  modifiedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifierId TEXT,
  modifierName TEXT,
  isRemoved INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_configs_scope ON configs(scope);
CREATE INDEX idx_configs_userId ON configs(userId);
CREATE INDEX idx_configs_group ON configs(`group`);
CREATE INDEX idx_configs_key ON configs(`key`);
CREATE UNIQUE INDEX idx_configs_unique ON configs(scope, userId, `group`, `key`);

-- 插入预设全局配置

-- 系统配置组
INSERT INTO configs (id, scope, `group`, `key`, value, valueType, description, isPublic, isEditable, defaultValue, sort, groupName, version) VALUES
('sys-site-name', 'global', 'system', 'siteName', '但以理管理系统', 'string', '站点名称', 1, 1, '但以理管理系统', 1, '系统配置', 1),
('sys-site-logo', 'global', 'system', 'siteLogo', '/assets/logo/favicon.png', 'string', '站点Logo', 1, 1, '/assets/logo/favicon.png', 2, '系统配置', 1),
('sys-copyright', 'global', 'system', 'copyright', '© 2025 Daniel System', 'string', '版权信息', 1, 1, '© 2025 Daniel System', 3, '系统配置', 1),
('sys-maintenance', 'global', 'system', 'maintenanceMode', 'false', 'boolean', '维护模式', 0, 1, 'false', 4, '系统配置', 1);

-- 界面配置组
INSERT INTO configs (id, scope, `group`, `key`, value, valueType, description, isPublic, isEditable, defaultValue, sort, groupName, version) VALUES
('ui-theme', 'global', 'ui', 'theme', 'light', 'string', '主题模式（light/dark）', 1, 1, 'light', 1, '界面配置', 1),
('ui-primary-color', 'global', 'ui', 'primaryColor', '#409EFF', 'string', '主题色', 1, 1, '#409EFF', 2, '界面配置', 1),
('ui-language', 'global', 'ui', 'language', 'zh-CN', 'string', '语言', 1, 1, 'zh-CN', 3, '界面配置', 1),
('ui-timezone', 'global', 'ui', 'timezone', 'Asia/Shanghai', 'string', '时区', 1, 1, 'Asia/Shanghai', 4, '界面配置', 1),
('ui-date-format', 'global', 'ui', 'dateFormat', 'YYYY-MM-DD HH:mm:ss', 'string', '日期格式', 1, 1, 'YYYY-MM-DD HH:mm:ss', 5, '界面配置', 1);

-- 通知配置组
INSERT INTO configs (id, scope, `group`, `key`, value, valueType, description, isPublic, isEditable, defaultValue, sort, groupName, version) VALUES
('notif-email', 'global', 'notification', 'emailEnabled', 'true', 'boolean', '邮件通知开关', 1, 1, 'true', 1, '通知配置', 1),
('notif-sms', 'global', 'notification', 'smsEnabled', 'true', 'boolean', '短信通知开关', 1, 1, 'true', 2, '通知配置', 1),
('notif-browser', 'global', 'notification', 'browserEnabled', 'true', 'boolean', '浏览器通知开关', 1, 1, 'true', 3, '通知配置', 1);

-- 安全配置组
INSERT INTO configs (id, scope, `group`, `key`, value, valueType, description, isPublic, isEditable, defaultValue, sort, groupName, version) VALUES
('sec-session-timeout', 'global', 'security', 'sessionTimeout', '7200', 'number', '会话超时时间（秒）', 0, 1, '7200', 1, '安全配置', 1),
('sec-password-min-length', 'global', 'security', 'passwordMinLength', '6', 'number', '密码最小长度', 0, 1, '6', 2, '安全配置', 1),
('sec-2fa-enabled', 'global', 'security', 'twoFactorEnabled', 'false', 'boolean', '双因素认证', 0, 1, 'false', 3, '安全配置', 1);

-- 隐私配置组
INSERT INTO configs (id, scope, `group`, `key`, value, valueType, description, isPublic, isEditable, defaultValue, sort, groupName, version) VALUES
('priv-data-collection', 'global', 'privacy', 'dataCollection', 'true', 'boolean', '数据收集', 1, 1, 'true', 1, '隐私配置', 1),
('priv-cookie-consent', 'global', 'privacy', 'cookieConsent', 'true', 'boolean', 'Cookie同意', 1, 1, 'true', 2, '隐私配置', 1);
