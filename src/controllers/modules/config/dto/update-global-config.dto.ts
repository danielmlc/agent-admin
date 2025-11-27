import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalConfigDto } from './create-global-config.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateGlobalConfigDto extends PartialType(
  OmitType(CreateGlobalConfigDto, ['groupId', 'key'] as const),
) { }
