import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@app/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../user/entities/refresh-token.entity';

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {
    const jwtConfig = configService.get('jwt', {
      refreshTokenSecret: 'default-refresh-secret',
    });

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.refreshTokenSecret,
    });
  }

  async validate(payload: RefreshTokenPayload) {
    const { sub, tokenId } = payload;

    // 查询 Refresh Token 是否存在
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { id: tokenId },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token 不存在');
    }

    if (refreshToken.userId !== sub) {
      throw new UnauthorizedException('Token 不匹配');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh Token 已过期');
    }

    return refreshToken;
  }
}
