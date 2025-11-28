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
  Role,
  Permission,
} from './entities';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      OAuthBinding,
      RefreshToken,
      LoginLog,
      IpRule,
      Role,
      Permission,
    ]),
  ],
  controllers: [UserController, RoleController],
  providers: [UserService, RoleService],
  exports: [UserService, RoleService, TypeOrmModule],
})
export class UserModule {}
