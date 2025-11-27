import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { SetUserConfigDto } from './dto/set-user-config.dto';
import { QueryGlobalConfigDto } from './dto/query-global-config.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('configs')
export class ConfigController {
  constructor(private readonly configService: ConfigService) { }

  // ==================== 全局配置管理（管理员） ====================

  @Get('global')
  getGlobalConfigs (@Query() query: QueryGlobalConfigDto) {
    return this.configService.getGlobalConfigs(query);
  }

  @Post('global')
  createGlobalConfig (@Body() dto: CreateConfigDto) {
    return this.configService.createGlobalConfig(dto);
  }

  @Put('global/:id')
  updateGlobalConfig (@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    return this.configService.updateGlobalConfig(id, dto);
  }

  @Delete('global/:id')
  async deleteGlobalConfig (@Param('id') id: string) {
    await this.configService.deleteGlobalConfig(id);
    return { message: '配置已删除' };
  }

  // ==================== 用户配置管理 ====================

  @Get('user')
  getUserConfigs (
    @CurrentUser() user: User,
    @Query('group') group?: string,
  ) {
    return this.configService.getUserConfigs(user.id, group);
  }

  @Get('user/:group/:key')
  getUserConfigByKey (
    @CurrentUser() user: User,
    @Param('group') group: string,
    @Param('key') key: string,
  ) {
    return this.configService.getUserConfigByKey(user.id, group, key);
  }

  @Put('user/:group/:key')
  setUserConfig (
    @CurrentUser() user: User,
    @Param('group') group: string,
    @Param('key') key: string,
    @Body() dto: SetUserConfigDto,
  ) {
    return this.configService.setUserConfig(user.id, group, key, dto);
  }

  @Delete('user/:group/:key')
  async deleteUserConfig (
    @CurrentUser() user: User,
    @Param('group') group: string,
    @Param('key') key: string,
  ) {
    await this.configService.deleteUserConfig(user.id, group, key);
    return { message: '用户配置已删除，已恢复为默认值' };
  }

  // ==================== 公开配置（前端使用） ====================

  @Public()
  @Get('public')
  getPublicConfigs (@CurrentUser() user?: User) {
    return this.configService.getPublicConfigs(user?.id);
  }

  // ==================== 配置组 ====================

  @Get('groups')
  getGroups () {
    return this.configService.getGroups();
  }
}
