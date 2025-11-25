import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { IsBoolean, IsInt } from 'class-validator';
export abstract class HasEnableDto extends BaseDto {
  @IsInt()
  sortCode?: number;
  @IsBoolean()
  isEnable?: boolean;
}

export abstract class HasEnableTreeDto extends TreeDto {
  @IsInt()
  sortCode?: number;
  @IsBoolean()
  isEnable?: boolean;
}
