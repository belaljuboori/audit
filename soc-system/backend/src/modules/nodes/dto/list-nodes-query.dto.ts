import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NodeEnvironment, NodeType } from '@prisma/client';

export class ListNodesQueryDto {
  @ApiProperty({ enum: NodeType, required: false })
  @IsOptional()
  @IsEnum(NodeType)
  type?: NodeType;

  @ApiProperty({ enum: NodeEnvironment, required: false })
  @IsOptional()
  @IsEnum(NodeEnvironment)
  environment?: NodeEnvironment;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  enabled?: boolean;
}
