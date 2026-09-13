import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ConfirmActionDto {
  @ApiProperty({ enum: [true] })
  @IsIn([true], { message: 'confirm must be true' })
  confirm!: true;
}
