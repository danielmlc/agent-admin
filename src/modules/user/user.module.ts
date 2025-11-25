import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import {
  User,
  OAuthBinding,
  RefreshToken,
  LoginLog,
  IpRule,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      OAuthBinding,
      RefreshToken,
      LoginLog,
      IpRule,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
