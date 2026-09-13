import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Base for any request body gated by ReAuthGuard. `currentPassword` is read
 * directly by the guard (not by the handler); `reason` is optional but, when
 * provided, is captured in the audit log entry for the action.
 */
export class SensitiveActionDto {
  @ApiProperty({ description: "The caller's current password, for re-authentication." })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  currentPassword!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
