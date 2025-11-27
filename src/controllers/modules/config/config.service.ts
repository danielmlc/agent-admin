import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RedisService } from '@app/redis';
import { Config, ConfigScope, ConfigValueType } from './entities';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { SetUserConfigDto } from './dto/set-user-config.dto';
import { QueryGlobalConfigDto } from './dto/query-global-config.dto';

@Injectable()
export class ConfigService {
  private readonly CACHE_PREFIX = 'config:';
  private readonly GLOBAL_CACHE_TTL = 3600; // 1小时
  private readonly USER_CACHE_TTL = 1800; // 30分钟

  constructor(
    @InjectRepository(Config)
    private readonly configRepository: Repository<Config>,
    private readonly redisService: RedisService,
  ) { }

  // ==================== 全局配置管理 ====================

  async createGlobalConfig (dto: CreateConfigDto): Promise<Config> {
    // 检查键是否已存在
    const existing = await this.configRepository.findOne({
      where: {
        scope: ConfigScope.GLOBAL,
        group: dto.group,
        key: dto.key,
        userId: IsNull(),
      },
    });

    if (existing) {
      throw new ConflictException('配置键已存在');
    }

    // 验证值格式
    this.validateConfigValue(dto.value, dto.valueType);

    const config = this.configRepository.create({
      ...dto,
      scope: ConfigScope.GLOBAL,
      userId: null,
    });

    const saved = await this.configRepository.save(config);

    // 清除缓存
    await this.clearGlobalConfigCache();

    return saved;
  }

  async getGlobalConfigs (query: QueryGlobalConfigDto): Promise<{ data: Config[]; total: number }> {
    const where: any = {
      scope: ConfigScope.GLOBAL,
      userId: IsNull(),
    };

    if (query.group) {
      where.group = query.group;
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [data, total] = await this.configRepository.findAndCount({
      where,
      order: { group: 'ASC', sort: 'ASC', createdAt: 'ASC' },
      skip,
      take: pageSize,
    });

    return { data, total };
  }

  async getGlobalConfigByKey (
    group: string,
    key: string,
  ): Promise<Config | null> {
    return this.configRepository.findOne({
      where: {
        scope: ConfigScope.GLOBAL,
        group,
        key,
        userId: IsNull(),
      },
    });
  }

  async updateGlobalConfig (
    id: string,
    dto: UpdateConfigDto,
  ): Promise<Config> {
    const config = await this.configRepository.findOne({
      where: { id, scope: ConfigScope.GLOBAL },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    // 验证值格式
    if (dto.value && dto.valueType) {
      this.validateConfigValue(dto.value, dto.valueType);
    }

    Object.assign(config, dto);
    const saved = await this.configRepository.save(config);

    // 清除缓存
    await this.clearGlobalConfigCache();

    return saved;
  }

  async deleteGlobalConfig (id: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { id, scope: ConfigScope.GLOBAL },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    await this.configRepository.remove(config);

    // 清除缓存
    await this.clearGlobalConfigCache();
  }

  // ==================== 用户配置管理 ====================

  async getUserConfigs (userId: string, group?: string): Promise<any[]> {
    // 尝试从缓存获取
    const cacheKey = `${this.CACHE_PREFIX}user:${userId}:${group || 'all'}`;
    const redis = this.redisService.getRedis();
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // 获取全局配置
    const globalWhere: any = {
      scope: ConfigScope.GLOBAL,
      userId: IsNull(),
    };
    if (group) {
      globalWhere.group = group;
    }

    const globalConfigs = await this.configRepository.find({
      where: globalWhere,
      order: { group: 'ASC', sort: 'ASC' },
    });

    // 获取用户配置
    const userWhere: any = {
      scope: ConfigScope.USER,
      userId,
    };
    if (group) {
      userWhere.group = group;
    }

    const userConfigs = await this.configRepository.find({
      where: userWhere,
    });

    // 合并配置（用户配置优先）
    const configMap = new Map<string, any>();

    // 先添加全局配置
    globalConfigs.forEach((config) => {
      const configKey = `${config.group}:${config.key}`;
      configMap.set(configKey, {
        id: config.id,
        group: config.group,
        groupName: config.groupName,
        key: config.key,
        value: this.parseConfigValue(config.value, config.valueType),
        valueType: config.valueType,
        description: config.description,
        isUserConfig: false,
        isEditable: config.isEditable,
        defaultValue: config.defaultValue
          ? this.parseConfigValue(config.defaultValue, config.valueType)
          : null,
        sort: config.sort,
      });
    });

    // 用户配置覆盖全局配置
    userConfigs.forEach((config) => {
      const configKey = `${config.group}:${config.key}`;
      const existing = configMap.get(configKey);
      configMap.set(configKey, {
        ...existing,
        id: config.id,
        value: this.parseConfigValue(config.value, config.valueType),
        valueType: config.valueType,
        isUserConfig: true,
      });
    });

    const result = Array.from(configMap.values());

    // 缓存结果
    await redis.setex(cacheKey, this.USER_CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async getUserConfigByKey (
    userId: string,
    group: string,
    key: string,
  ): Promise<any> {
    // 先查找用户配置
    const userConfig = await this.configRepository.findOne({
      where: {
        scope: ConfigScope.USER,
        userId,
        group,
        key,
      },
    });

    if (userConfig) {
      return {
        id: userConfig.id,
        group: userConfig.group,
        groupName: userConfig.groupName,
        key: userConfig.key,
        value: this.parseConfigValue(userConfig.value, userConfig.valueType),
        valueType: userConfig.valueType,
        isUserConfig: true,
      };
    }

    // 如果没有用户配置，返回全局配置
    const globalConfig = await this.getGlobalConfigByKey(group, key);
    if (globalConfig) {
      return {
        id: globalConfig.id,
        group: globalConfig.group,
        groupName: globalConfig.groupName,
        key: globalConfig.key,
        value: this.parseConfigValue(
          globalConfig.value,
          globalConfig.valueType,
        ),
        valueType: globalConfig.valueType,
        description: globalConfig.description,
        isUserConfig: false,
        isEditable: globalConfig.isEditable,
        defaultValue: globalConfig.defaultValue
          ? this.parseConfigValue(
            globalConfig.defaultValue,
            globalConfig.valueType,
          )
          : null,
      };
    }

    throw new NotFoundException('配置不存在');
  }

  async setUserConfig (
    userId: string,
    group: string,
    key: string,
    dto: SetUserConfigDto,
  ): Promise<Config> {
    // 验证全局配置存在且可编辑
    const globalConfig = await this.getGlobalConfigByKey(group, key);
    if (!globalConfig) {
      throw new NotFoundException('配置不存在');
    }

    if (!globalConfig.isEditable) {
      throw new BadRequestException('该配置不允许修改');
    }

    // 验证值格式
    this.validateConfigValue(dto.value, dto.valueType);

    // 查找或创建用户配置
    let userConfig = await this.configRepository.findOne({
      where: {
        scope: ConfigScope.USER,
        userId,
        group,
        key,
      },
    });

    if (userConfig) {
      userConfig.value = dto.value;
      userConfig.valueType = dto.valueType;
    } else {
      userConfig = this.configRepository.create({
        scope: ConfigScope.USER,
        userId,
        group,
        groupName: globalConfig.groupName,
        key,
        value: dto.value,
        valueType: dto.valueType,
      });
    }

    const saved = await this.configRepository.save(userConfig);

    // 清除用户配置缓存
    await this.clearUserConfigCache(userId);

    return saved;
  }

  async deleteUserConfig (
    userId: string,
    group: string,
    key: string,
  ): Promise<void> {
    const userConfig = await this.configRepository.findOne({
      where: {
        scope: ConfigScope.USER,
        userId,
        group,
        key,
      },
    });

    if (!userConfig) {
      throw new NotFoundException('用户配置不存在');
    }

    await this.configRepository.remove(userConfig);

    // 清除用户配置缓存
    await this.clearUserConfigCache(userId);
  }

  // ==================== 公开配置获取 ====================

  async getPublicConfigs (userId?: string): Promise<any> {
    // 获取所有公开的全局配置
    const globalConfigs = await this.configRepository.find({
      where: {
        scope: ConfigScope.GLOBAL,
        isPublic: true,
        userId: IsNull(),
      },
    });

    const configMap = new Map<string, any>();

    // 添加全局配置
    globalConfigs.forEach((config) => {
      const configKey = `${config.group}:${config.key}`;
      configMap.set(configKey, {
        group: config.group,
        key: config.key,
        value: this.parseConfigValue(config.value, config.valueType),
        valueType: config.valueType,
      });
    });

    // 如果提供了userId，合并用户配置
    if (userId) {
      const userConfigs = await this.configRepository.find({
        where: {
          scope: ConfigScope.USER,
          userId,
        },
      });

      userConfigs.forEach((config) => {
        const configKey = `${config.group}:${config.key}`;
        // 只覆盖公开的配置
        if (configMap.has(configKey)) {
          const existing = configMap.get(configKey);
          configMap.set(configKey, {
            ...existing,
            value: this.parseConfigValue(config.value, config.valueType),
          });
        }
      });
    }

    // 按组分组返回
    const result: any = {};
    configMap.forEach((config) => {
      const groupCode = config.group || 'default';
      if (!result[groupCode]) {
        result[groupCode] = {};
      }
      result[groupCode][config.key] = config.value;
    });

    return result;
  }

  // ==================== 配置组管理 ====================

  async getGroups (): Promise<any[]> {
    // SQLite不支持QueryBuilder的DISTINCT语法，改用普通查询
    const configs = await this.configRepository.find({
      where: {
        scope: ConfigScope.GLOBAL,
        userId: IsNull(),
      },
      order: { group: 'ASC' },
    });

    // 手动去重
    const groupMap = new Map<string, string>();
    configs.forEach((config) => {
      if (!groupMap.has(config.group)) {
        groupMap.set(config.group, config.groupName || config.group);
      }
    });

    return Array.from(groupMap.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }

  // ==================== 辅助方法 ====================

  private validateConfigValue (value: string, valueType: ConfigValueType): void {
    try {
      switch (valueType) {
        case ConfigValueType.NUMBER:
          if (isNaN(Number(value))) {
            throw new Error('Invalid number');
          }
          break;
        case ConfigValueType.BOOLEAN:
          if (value !== 'true' && value !== 'false') {
            throw new Error('Invalid boolean');
          }
          break;
        case ConfigValueType.JSON:
        case ConfigValueType.ARRAY:
          JSON.parse(value);
          break;
        case ConfigValueType.STRING:
        default:
          // 字符串不需要验证
          break;
      }
    } catch (error) {
      throw new BadRequestException(`配置值格式错误: ${valueType}`);
    }
  }

  private parseConfigValue (value: string, valueType: ConfigValueType): any {
    switch (valueType) {
      case ConfigValueType.NUMBER:
        return Number(value);
      case ConfigValueType.BOOLEAN:
        return value === 'true';
      case ConfigValueType.JSON:
      case ConfigValueType.ARRAY:
        return JSON.parse(value);
      case ConfigValueType.STRING:
      default:
        return value;
    }
  }

  private async clearGlobalConfigCache (): Promise<void> {
    const redis = this.redisService.getRedis();
    const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  private async clearUserConfigCache (userId: string): Promise<void> {
    const redis = this.redisService.getRedis();
    const keys = await redis.keys(`${this.CACHE_PREFIX}user:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
