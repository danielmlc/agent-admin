import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@app/config';
import { UserService } from '../../user/user.service';
import { RedisService } from '@app/redis';

export interface JwtPayload {
  sub: string;
  username: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {
    const jwtConfig = configService.get('jwt', {
      accessTokenSecret: 'daniel-access-secret',
    });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessTokenSecret,
    });
  }

  async validate (payload: JwtPayload) {
    const { sub, jti } = payload;

    // 检查 Token 是否在黑名单中
    const redis = this.redisService.getRedis();
    const isBlacklisted = await redis.exists(`token:blacklist:${jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token 已失效');
    }

    // 查询用户信息
    const user = await this.userService.findById(sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 'normal') {
      throw new UnauthorizedException('用户已被禁用或锁定');
    }

    return user;
  }
}
