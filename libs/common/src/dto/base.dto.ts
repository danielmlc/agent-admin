import { IsDate, IsString, IsBoolean, IsInt } from 'class-validator';
export abstract class BaseDto {
  @IsDate()
  createdAt?: Date;
  @IsString()
  creatorId?: string;
  @IsString()
  creatorName?: string;
  @IsDate()
  modifiedAt?: Date;
  @IsString()
  modifierId?: string;
  @IsString()
  modifierName?: string;
  @IsBoolean()
  isRemoved?: boolean;
  @IsInt()
  version?: number;
}
