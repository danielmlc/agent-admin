import { BaseDto } from './base.dto';
import { IsString, IsInt, IsBoolean } from 'class-validator';
export abstract class TreeDto extends BaseDto {
  @IsString()
  parentId?: string;
  @IsString()
  fullId?: string;
  @IsString()
  fullName?: string;
  @IsInt()
  level?: number;
  @IsBoolean()
  isLeaf?: boolean;
}
