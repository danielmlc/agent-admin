import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ConfigValueType } from '../entities/config.entity';

export class CreateConfigDto {
  @IsString()
  group: string;

  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsEnum(ConfigValueType)
  valueType: ConfigValueType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsString()
  groupName?: string;
}
