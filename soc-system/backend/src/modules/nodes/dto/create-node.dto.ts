import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NodeType, NodeEnvironment, NodeAuthMethod } from '@prisma/client';
import { NodeCredentialDto } from './node-credential.dto';

// Accepts an IPv4 address, an IPv6 address, or an RFC 1123 hostname/FQDN.
const HOST_PATTERN =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$|^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

export class CreateNodeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiProperty({ enum: NodeType })
  @IsEnum(NodeType)
  type!: NodeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: NodeEnvironment, required: false })
  @IsOptional()
  @IsEnum(NodeEnvironment)
  environment?: NodeEnvironment;

  @ApiProperty()
  @IsString()
  @Matches(HOST_PATTERN, { message: 'host must be a valid IPv4/IPv6 address or hostname' })
  @MaxLength(255)
  host!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiBaseUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  apiVersion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vdom?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  tlsVerify?: boolean;

  @ApiProperty({ required: false, description: 'PEM-encoded internal CA certificate' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @Matches(/-----BEGIN CERTIFICATE-----/, {
    message: 'customCaCertificate must be a PEM-encoded certificate',
  })
  customCaCertificate?: string;

  @ApiProperty({ enum: NodeAuthMethod })
  @IsEnum(NodeAuthMethod)
  authMethod!: NodeAuthMethod;

  @ApiProperty({ type: NodeCredentialDto })
  @ValidateNested()
  @Type(() => NodeCredentialDto)
  credential!: NodeCredentialDto;

  @ApiProperty({ required: false, default: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86400)
  pollingIntervalSeconds?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  syslogPort?: number;

  @ApiProperty({ required: false, default: 5000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(60000)
  connectionTimeoutMs?: number;

  @ApiProperty({ required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retryMaxAttempts?: number;

  @ApiProperty({ required: false, default: 2000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  retryBackoffMs?: number;
}
