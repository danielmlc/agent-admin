import { IsString, IsEnum } from 'class-validator';
import { ConfigValueType } from '../entities/config.entity';

export class SetUserConfigDto {
  @IsString()
  value: string;

  @IsEnum(ConfigValueType)
  valueType: ConfigValueType;
}
