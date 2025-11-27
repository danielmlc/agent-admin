import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  findAll (@Query() queryDto: QueryUserDto) {
    return this.userService.findAll(queryDto);
  }

  @Get(':id')
  findOne (@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Post()
  create (@Body() createUserDto: CreateUserDto, @CurrentUser() currentUser?: User) {
    return this.userService.create(
      createUserDto,
      currentUser?.id,
      currentUser?.nickname || currentUser?.username,
    );
  }

  @Patch(':id')
  update (
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.userService.update(
      id,
      updateUserDto,
      currentUser?.id,
      currentUser?.nickname || currentUser?.username,
    );
  }

  @Delete(':id')
  remove (@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Put('change-password')
  async changePassword (
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ) {
    await this.userService.changePassword(
      currentUser.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: '密码修改成功' };
  }

  @Put(':id/reset-password')
  async resetPassword (
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @CurrentUser() currentUser?: User,
  ) {
    await this.userService.resetPassword(
      id,
      resetPasswordDto.newPassword,
      currentUser?.id,
      currentUser?.nickname || currentUser?.username,
    );
    return { message: '密码重置成功' };
  }
}
