import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { CaptchaModule } from '@app/captcha';
import { SmsModule, SmsSupper } from '@app/sms';
import { ConfigService } from '@app/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get('jwt', {
          accessTokenSecret: 'default-access-secret',
          accessTokenExpire: '2h',
        });

        return {
          secret: jwtConfig.accessTokenSecret,
          signOptions: { expiresIn: jwtConfig.accessTokenExpire as any },
        };
      },
    }),
    CaptchaModule,
    SmsModule.forRootAsync(
      {
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return configService.get('sms', {
            provider: SmsSupper.aliyun,
            accessKeyId: '',
            accessKeySecret: '',
          });
        },
      },
      true,
    ),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, GithubStrategy],
  exports: [AuthService],
})
export class AuthModule {}
