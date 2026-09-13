import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SensitiveActionDto } from '../../../common/dto/sensitive-action.dto';

export class DeleteNodeDto extends SensitiveActionDto {
  @ApiProperty({ enum: [true], description: 'Must be explicitly true — a second, deliberate confirmation beyond a UI dialog.' })
  @IsIn([true], { message: 'confirm must be true to delete a node' })
  confirm!: true;
}
