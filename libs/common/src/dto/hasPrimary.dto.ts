import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { HasEnableDto, HasEnableTreeDto } from './hasEnable.dto';
import { IsString } from 'class-validator';
export abstract class HasPrimaryDto extends BaseDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryTreeDto extends TreeDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryFullDto extends HasEnableDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryFullTreeDto extends HasEnableTreeDto {
  @IsString()
  id?: string;
}
