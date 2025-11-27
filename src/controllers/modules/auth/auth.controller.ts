import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  Ip,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CaptchaService } from '@app/captcha';
import { ConfigService } from '@app/config';
import { LoginUsernameDto } from './dto/login-username.dto';
import { LoginSmsDto } from './dto/login-sms.dto';
import { SendSmsCodeDto } from './dto/send-sms-code.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../user/entities/user.entity';
import { RefreshToken } from '../user/entities/refresh-token.entity';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly configService: ConfigService,
  ) { }

  @Public()
  @Get('captcha')
  async getCaptcha () {
    const captcha = await this.captchaService.generate();
    return {
      id: captcha.id,
      image: captcha.data,
    };
  }

  @Public()
  @Get('login-fail-count')
  async getLoginFailCount (
    @Query('username') username: string,
    @Ip() ipAddress: string,
  ) {
    const count = await this.authService.getLoginFailCount(username, ipAddress);
    return {
      count,
      requireCaptcha: count >= 3,
    };
  }

  @Public()
  @Post('send-sms-code')
  async sendSmsCode (@Body() sendSmsCodeDto: SendSmsCodeDto) {
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
  async loginByUsername (
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
  async loginBySms (
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
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  githubAuth () {
    // Passport 会自动重定向到 GitHub 授权页面
    // 由 GithubStrategy 处理
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback (
    @Req() req: any,
    @Res() res: Response,
    @Ip() ipAddress: string,
  ) {
    const oauthData = req.user; // 来自 GithubStrategy.validate

    // 从配置文件读取前端回调地址
    const oauthConfig = this.configService.get('oauth.github');

    try {
      // 调用 authService.loginByOAuth 处理登录
      const result = await this.authService.loginByOAuth(
        oauthData.provider,
        oauthData.providerId,
        oauthData.profile,
        oauthData.accessToken,
        ipAddress,
        req.headers['user-agent'] || '',
      );

      // 重定向回前端，并携带 token
      const redirectUrl = `${oauthConfig.frontendCallbackUrl}?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error: any) {
      // 登录失败，重定向回登录页并携带错误信息
      const errorMsg = encodeURIComponent(error.message || 'OAuth 登录失败');
      const redirectUrl = `${oauthConfig.frontendLoginUrl}/#/?error=${errorMsg}`;
      res.redirect(redirectUrl);
    }
  }

  @Public()
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refreshToken (
    @CurrentUser() refreshToken: RefreshToken,
    @Ip() ipAddress: string,
  ) {
    return this.authService.refreshAccessToken(refreshToken, ipAddress);
  }

  @Post('logout')
  async logout (@CurrentUser() user: User, @Req() req: Request) {
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
  getProfile (@CurrentUser() user: User) {
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

  @Get('login-logs')
  async getLoginLogs (
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('loginType') loginType?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.authService.getLoginLogs(user.id, {
      status,
      loginType,
      page: page || 1,
      pageSize: pageSize || 10,
    });
  }

  @Get('refresh-tokens')
  async getRefreshTokens (@CurrentUser() user: User, @Req() req: Request) {
    const currentToken = req.headers.authorization?.split(' ')[1];
    return this.authService.getRefreshTokens(user.id, currentToken);
  }

  @Delete('refresh-tokens/:tokenId')
  async revokeRefreshToken (
    @CurrentUser() user: User,
    @Param('tokenId') tokenId: string,
  ) {
    await this.authService.revokeRefreshToken(user.id, tokenId);
    return { message: 'Token已撤销' };
  }

  @Delete('refresh-tokens')
  async revokeAllRefreshTokens (
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const currentToken = req.headers.authorization?.split(' ')[1];
    await this.authService.revokeAllRefreshTokens(user.id, currentToken);
    return { message: '所有Token已撤销' };
  }
}
