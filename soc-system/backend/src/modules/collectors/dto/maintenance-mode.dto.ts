import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { SensitiveActionDto } from '../../../common/dto/sensitive-action.dto';

export class MaintenanceModeDto extends SensitiveActionDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
