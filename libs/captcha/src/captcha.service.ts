import { Injectable, Inject } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { nanoid } from 'nanoid';
import { RedisService } from '@libs/redis';
import { CaptchaResult, CaptchaOptions } from './captcha.interface';

@Injectable()
export class CaptchaService {
  private readonly CAPTCHA_PREFIX = 'captcha:';
  private readonly DEFAULT_EXPIRE = 120; // 2分钟

  constructor(private readonly redisService: RedisService) { }

  async generate (options?: CaptchaOptions): Promise<CaptchaResult> {
    const captcha = svgCaptcha.create({
      size: options?.size || 4,
      noise: options?.noise || 2,
      color: options?.color || true,
      background: options?.background || '#f0f0f0',
      width: options?.width || 100,
      height: options?.height || 40,
      fontSize: options?.fontSize || 50,
      charPreset: options?.charPreset,
    });

    const id = nanoid();
    const redis = this.redisService.getRedis();
    // 将验证码文本存储到 Redis，不区分大小写
    await redis.setex(
      `${this.CAPTCHA_PREFIX}${id}`,
      this.DEFAULT_EXPIRE,
      captcha.text.toLowerCase(),
    );

    return {
      id,
      data: captcha.data,
      text: captcha.text,
    };
  }

  async verify (id: string, code: string): Promise<boolean> {
    const redis = this.redisService.getRedis();
    const key = `${this.CAPTCHA_PREFIX}${id}`;

    const storedCode = await redis.get(key);
    if (!storedCode) {
      return false;
    }

    // 验证成功后删除验证码
    await redis.del(key);

    // 不区分大小写比较
    return storedCode === code.toLowerCase();
  }

  async refresh (id: string): Promise<void> {
    const redis = this.redisService.getRedis();
    const key = `${this.CAPTCHA_PREFIX}${id}`;
    await redis.del(key);
  }
}
