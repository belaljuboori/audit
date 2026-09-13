import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { NodeCredentialType } from '@prisma/client';

export class NodeCredentialDto {
  @ApiProperty({ enum: NodeCredentialType })
  @IsEnum(NodeCredentialType)
  credentialType!: NodeCredentialType;

  @ApiProperty({
    description:
      'Raw secret value (API token / password). For USERNAME_PASSWORD or ' +
      'SERVICE_ACCOUNT_JSON, pass a JSON-stringified payload — it is encrypted ' +
      'as an opaque blob either way.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  secret!: string;
}
