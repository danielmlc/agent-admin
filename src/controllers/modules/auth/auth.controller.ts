import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CaptchaService } from '@app/captcha';
import { LoginUsernameDto } from './dto/login-username.dto';
import { LoginSmsDto } from './dto/login-sms.dto';
import { SendSmsCodeDto } from './dto/send-sms-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from '../user/entities/refresh-token.entity';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Public()
  @Get('captcha')
  async getCaptcha() {
    const captcha = await this.captchaService.generate();
    return {
      id: captcha.id,
      image: captcha.data,
    };
  }

  @Public()
  @Post('send-sms-code')
  async sendSmsCode(@Body() sendSmsCodeDto: SendSmsCodeDto) {
    await this.authService.sendSmsCode(
      sendSmsCodeDto.phone,
      sendSmsCodeDto.captchaId,
      sendSmsCodeDto.captchaCode,
    );
    return {
      message: '验证码发送成功',
    };
  }

  @Public()
  @Post('login/username')
  async loginByUsername(
    @Body() loginDto: LoginUsernameDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    return this.authService.loginByUsername(
      loginDto.username,
      loginDto.password,
      loginDto.captchaId,
      loginDto.captchaCode,
      ipAddress,
      req.headers['user-agent'] || '',
    );
  }

  @Public()
  @Post('login/sms')
  async loginBySms(
    @Body() loginDto: LoginSmsDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    return this.authService.loginBySms(
      loginDto.phone,
      loginDto.smsCode,
      ipAddress,
      req.headers['user-agent'] || '',
    );
  }

  @Public()
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refreshToken(
    @CurrentUser() refreshToken: RefreshToken,
    @Ip() ipAddress: string,
  ) {
    return this.authService.refreshAccessToken(refreshToken, ipAddress);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      await this.authService.logout(user.id, decoded.jti);
    }
    return {
      message: '登出成功',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      nickname: user.nickname,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
