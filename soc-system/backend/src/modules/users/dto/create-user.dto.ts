import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username may only contain letters, numbers, dot, underscore and dash',
  })
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12, { message: 'password must be at least 12 characters' })
  @MaxLength(256)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @ApiProperty({ type: [String], description: 'Roles to assign at creation time; may be empty and assigned later via PATCH /users/:id/roles' })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}
