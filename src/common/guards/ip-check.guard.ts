import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpRule, RuleType } from '../../modules/user/entities/ip-rule.entity';
import { RedisService } from '@libs/redis';

@Injectable()
export class IpCheckGuard implements CanActivate {
  private readonly IP_CACHE_PREFIX = 'ip:rule:';

  constructor(
    @InjectRepository(IpRule)
    private readonly ipRuleRepository: Repository<IpRule>,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = request.ip;

    // 检查黑名单
    const isBlacklisted = await this.checkIpRule(ipAddress, RuleType.BLACKLIST);
    if (isBlacklisted) {
      throw new ForbiddenException('您的IP已被限制访问');
    }

    // 这里可以选择性启用白名单
    // const isWhitelisted = await this.checkIpRule(ipAddress, RuleType.WHITELIST);
    // if (!isWhitelisted) {
    //   throw new ForbiddenException('您的IP不在白名单中');
    // }

    return true;
  }

  private async checkIpRule(
    ipAddress: string,
    ruleType: RuleType,
  ): Promise<boolean> {
    const redis = this.redisService.getRedis();
    const cacheKey = `${this.IP_CACHE_PREFIX}${ruleType}:${ipAddress}`;

    // 检查 Redis 缓存
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    // 从数据库查询
    const rule = await this.ipRuleRepository.findOne({
      where: {
        ipAddress,
        ruleType,
      },
    });

    const exists = !!rule && (!rule.expiresAt || new Date() < rule.expiresAt);

    // 缓存结果（1小时）
    await redis.setex(cacheKey, 3600, exists ? '1' : '0');

    return exists;
  }
}
