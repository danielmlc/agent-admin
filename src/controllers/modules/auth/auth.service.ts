import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@app/config';
import { RedisService } from '@app/redis';
import { CaptchaService } from '@app/captcha';
import { SmsService } from '@app/sms';
import { UserService } from '../user/user.service';
import {
  User,
  RefreshToken,
  LoginLog,
  OAuthBinding,
} from '../user/entities';
import { LoginType, LoginStatus } from '../user/entities/login-log.entity';
import { OAuthProvider } from '../user/entities/oauth-binding.entity';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly SMS_CODE_PREFIX = 'sms:code:';
  private readonly SMS_SEND_PREFIX = 'sms:send:';
  private readonly SMS_DAILY_PREFIX = 'sms:daily:';
  private readonly LOGIN_FAIL_PREFIX = 'login:fail:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly captchaService: CaptchaService,
    private readonly smsService: SmsService,
    private readonly userService: UserService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepository: Repository<LoginLog>,
    @InjectRepository(OAuthBinding)
    private readonly oauthBindingRepository: Repository<OAuthBinding>,
  ) { }

  // 用户名密码登录
  async loginByUsername (
    username: string,
    password: string,
    captchaId: string,
    captchaCode: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 验证图形验证码
    const isValidCaptcha = await this.captchaService.verify(captchaId, captchaCode);
    if (!isValidCaptcha) {
      throw new BadRequestException('图形验证码错误');
    }

    // 检查登录失败次数
    await this.checkLoginFailLimit(username, ipAddress);

    // 查找用户
    const user = await this.userService.findByUsername(username);
    if (!user) {
      await this.recordLoginFail(username, ipAddress);
      await this.logLogin(null, LoginType.PASSWORD, ipAddress, userAgent, LoginStatus.FAILED, '用户不存在');
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isValidPassword = await this.userService.verifyPassword(user, password);
    if (!isValidPassword) {
      await this.recordLoginFail(username, ipAddress);
      await this.logLogin(user.id, LoginType.PASSWORD, ipAddress, userAgent, LoginStatus.FAILED, '密码错误');
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== 'normal') {
      await this.logLogin(user.id, LoginType.PASSWORD, ipAddress, userAgent, LoginStatus.FAILED, '用户已被禁用或锁定');
      throw new UnauthorizedException('用户已被禁用或锁定');
    }

    // 清除登录失败记录
    await this.clearLoginFail(username, ipAddress);

    // 生成 Token
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // 更新最后登录时间
    await this.userService.updateLastLoginAt(user.id);

    // 记录登录日志
    await this.logLogin(user.id, LoginType.PASSWORD, ipAddress, userAgent, LoginStatus.SUCCESS);

    return {
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        nickname: user.nickname,
      },
      ...tokens,
    };
  }

  // 发送短信验证码
  async sendSmsCode (
    phone: string,
    captchaId: string,
    captchaCode: string,
  ): Promise<void> {
    // 验证图形验证码
    const isValidCaptcha = await this.captchaService.verify(captchaId, captchaCode);
    if (!isValidCaptcha) {
      throw new BadRequestException('图形验证码错误');
    }

    const redis = this.redisService.getRedis();

    // 检查发送间隔（60秒）
    const sendKey = `${this.SMS_SEND_PREFIX}${phone}`;
    const hasSent = await redis.exists(sendKey);
    if (hasSent) {
      throw new BadRequestException('请勿频繁发送，请稍后再试');
    }

    // 检查每日发送次数（5次）
    const dailyKey = `${this.SMS_DAILY_PREFIX}${phone}`;
    const dailyCount = await redis.get(dailyKey);
    if (dailyCount && parseInt(dailyCount) >= 10) {
      throw new BadRequestException('今日发送次数已达上限');
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 获取短信配置
    const smsConfig = this.configService.get('sms');
    // 发送短信
    try {
      await this.smsService.sendSms({
        phoneNumbers: phone,
        signName: smsConfig.signName,
        templateCode: smsConfig.template['captcha'].code,
        templateParam: { code },
      });
    } catch (error) {
      throw new BadRequestException('短信发送失败，请稍后重试');
    }

    // 存储验证码（5分钟有效）
    const codeKey = `${this.SMS_CODE_PREFIX}${phone}`;
    await redis.setex(codeKey, 300, code);

    // 设置发送间隔（60秒）
    await redis.setex(sendKey, 60, '1');

    // 增加每日发送次数
    const currentCount = dailyCount ? parseInt(dailyCount) : 0;
    await redis.setex(dailyKey, 86400, (currentCount + 1).toString());
  }

  // 短信验证码登录
  async loginBySms (
    phone: string,
    smsCode: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const redis = this.redisService.getRedis();

    // 验证短信验证码
    const codeKey = `${this.SMS_CODE_PREFIX}${phone}`;
    const storedCode = await redis.get(codeKey);

    if (!storedCode || storedCode !== smsCode) {
      await this.logLogin(null, LoginType.SMS, ipAddress, userAgent, LoginStatus.FAILED, '验证码错误');
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 删除验证码
    await redis.del(codeKey);

    // 查找或创建用户
    let user = await this.userService.findByPhone(phone);
    if (!user) {
      // 首次登录，自动注册
      user = await this.userService.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
      });
    }

    // 检查用户状态
    if (user.status !== 'normal') {
      await this.logLogin(user.id, LoginType.SMS, ipAddress, userAgent, LoginStatus.FAILED, '用户已被禁用或锁定');
      throw new UnauthorizedException('用户已被禁用或锁定');
    }

    // 生成 Token
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // 更新最后登录时间
    await this.userService.updateLastLoginAt(user.id);

    // 记录登录日志
    await this.logLogin(user.id, LoginType.SMS, ipAddress, userAgent, LoginStatus.SUCCESS);

    return {
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        nickname: user.nickname,
      },
      ...tokens,
    };
  }

  // 刷新 Token
  async refreshAccessToken (
    refreshToken: RefreshToken,
    ipAddress: string,
  ) {
    const user = refreshToken.user;

    // 生成新的 Access Token
    const jwtConfig = this.configService.get('jwt', {
      accessTokenSecret: 'default-access-secret',
      accessTokenExpire: '2h',
    });

    const jti = nanoid();
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        jti,
      },
      {
        secret: jwtConfig.accessTokenSecret,
        expiresIn: jwtConfig.accessTokenExpire as any,
      },
    );

    // 更新 Refresh Token 最后使用时间
    refreshToken.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }

  // 登出
  async logout (userId: string, jti: string): Promise<void> {
    const redis = this.redisService.getRedis();

    // 将 Access Token 加入黑名单
    // 计算剩余有效期
    const jwtConfig = this.configService.get('jwt', {
      accessTokenExpire: '2h',
    });
    const expireSeconds = this.parseExpireToSeconds(jwtConfig.accessTokenExpire);

    await redis.setex(`token:blacklist:${jti}`, expireSeconds, '1');
  }

  // 生成 Token（Access Token + Refresh Token）
  private async generateTokens (
    user: User,
    ipAddress: string,
    userAgent: string,
  ) {
    const jwtConfig = this.configService.get('jwt', {
      accessTokenSecret: 'default-access-secret',
      accessTokenExpire: '2h',
      refreshTokenSecret: 'default-refresh-secret',
      refreshTokenExpire: '7d',
    });

    // 生成 Access Token
    const jti = nanoid();
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        jti,
      },
      {
        secret: jwtConfig.accessTokenSecret,
        expiresIn: jwtConfig.accessTokenExpire as any,
      },
    );

    // 生成 Refresh Token
    const tokenId = nanoid();
    const refreshTokenJwt = this.jwtService.sign(
      {
        sub: user.id,
        tokenId,
      },
      {
        secret: jwtConfig.refreshTokenSecret,
        expiresIn: jwtConfig.refreshTokenExpire as any,
      },
    );

    // 计算过期时间
    const refreshExpireSeconds = this.parseExpireToSeconds(jwtConfig.refreshTokenExpire);
    const expiresAt = new Date(Date.now() + refreshExpireSeconds * 1000);

    // 存储 Refresh Token 到数据库
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenJwt)
      .digest('hex');

    const refreshToken = this.refreshTokenRepository.create({
      id: tokenId,
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
      deviceInfo: { userAgent, ipAddress },
    });

    await this.refreshTokenRepository.save(refreshToken);

    // 清理过期的 Refresh Token
    await this.refreshTokenRepository.delete({
      userId: user.id,
      expiresAt: LessThan(new Date()),
    });

    return {
      accessToken,
      refreshToken: refreshTokenJwt,
      tokenType: 'Bearer',
      expiresIn: refreshExpireSeconds,
    };
  }

  // 记录登录失败
  private async recordLoginFail (identifier: string, ipAddress: string): Promise<void> {
    const redis = this.redisService.getRedis();
    const key = `${this.LOGIN_FAIL_PREFIX}${identifier}:${ipAddress}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 600); // 10分钟过期
    }
  }

  // 检查登录失败次数限制
  private async checkLoginFailLimit (identifier: string, ipAddress: string): Promise<void> {
    const redis = this.redisService.getRedis();
    const key = `${this.LOGIN_FAIL_PREFIX}${identifier}:${ipAddress}`;

    const count = await redis.get(key);
    if (count && parseInt(count) >= 5) {
      throw new BadRequestException('登录失败次数过多，请10分钟后再试');
    }
  }

  // 清除登录失败记录
  private async clearLoginFail (identifier: string, ipAddress: string): Promise<void> {
    const redis = this.redisService.getRedis();
    const key = `${this.LOGIN_FAIL_PREFIX}${identifier}:${ipAddress}`;
    await redis.del(key);
  }

  // 记录登录日志
  private async logLogin (
    userId: string | null,
    loginType: LoginType,
    ipAddress: string,
    userAgent: string,
    status: LoginStatus,
    failureReason?: string,
  ): Promise<void> {
    const log = this.loginLogRepository.create({
      userId,
      loginType,
      ipAddress,
      userAgent,
      deviceInfo: { userAgent, ipAddress },
      status,
      failureReason,
    });

    await this.loginLogRepository.save(log);
  }

  // 解析过期时间字符串为秒数
  private parseExpireToSeconds (expire: string): number {
    const match = expire.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7200; // 默认2小时
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 7200;
    }
  }
}
