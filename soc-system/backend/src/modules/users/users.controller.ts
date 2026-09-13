import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ReplaceRolesDto } from './dto/replace-roles.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  async list() {
    return this.usersService.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @AuditAction('USER.CREATE', 'user')
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @AuditAction('USER.ROLES_REPLACE', 'user')
  async replaceRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReplaceRolesDto,
  ) {
    return this.usersService.replaceRoles(actor, id, dto.roleIds);
  }
}
