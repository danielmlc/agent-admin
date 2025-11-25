import { IsString, IsOptional, IsEmail, MinLength, IsBoolean, IsInt } from 'class-validator';
import { HasPrimaryFullDto } from '@app/common/dto';

export class CreateUserDto extends HasPrimaryFullDto {
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
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
