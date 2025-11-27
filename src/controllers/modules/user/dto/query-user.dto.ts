import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  keyword?: string; // 搜索关键词（用户名、手机号、邮箱、昵称）

  @IsEnum(UserStatus)
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: UserStatus; // 用户状态筛选

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1; // 页码

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 10; // 每页数量
}
