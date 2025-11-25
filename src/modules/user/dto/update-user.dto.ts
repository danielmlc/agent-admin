import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { HasPrimaryFullDto } from '@app/common/dto';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto extends HasPrimaryFullDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
