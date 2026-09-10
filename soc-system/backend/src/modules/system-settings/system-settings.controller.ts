import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_MANAGE)
  async list() {
    return this.settingsService.list();
  }

  @Put(':key')
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_MANAGE)
  @AuditAction('SYSTEM_SETTINGS.UPDATE', 'system_setting')
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingsService.set(key, dto.value as any, actor.id, dto.description);
  }
}
