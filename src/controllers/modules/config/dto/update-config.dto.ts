import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateConfigDto } from './create-config.dto';

export class UpdateConfigDto extends PartialType(
  OmitType(CreateConfigDto, ['group', 'key'] as const),
) { }
