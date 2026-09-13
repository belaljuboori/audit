import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectorsService } from './collectors.service';
import { BulkActionDto } from './dto/bulk-action.dto';
import { MaintenanceModeDto } from './dto/maintenance-mode.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReAuthGuard } from '../../common/guards/re-auth.guard';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('collectors')
@ApiBearerAuth()
@Controller('collectors')
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Get('maintenance-mode')
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_MANAGE)
  async getMaintenanceMode() {
    return { enabled: await this.collectorsService.isMaintenanceMode() };
  }

  @Post('maintenance-mode')
  @RequirePermissions(PERMISSIONS.SYSTEM_SETTINGS_MANAGE)
  @UseGuards(ReAuthGuard)
  @AuditAction('COLLECTOR.MAINTENANCE_MODE_SET', 'system')
  async setMaintenanceMode(@Body() dto: MaintenanceModeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.collectorsService.setMaintenanceMode(dto.enabled, actor.id);
  }

  @Post('start-all')
  @RequirePermissions(PERMISSIONS.COLLECTORS_START)
  @UseGuards(ReAuthGuard)
  @AuditAction('COLLECTOR.START_ALL', 'system')
  async startAll(@Body() _dto: BulkActionDto) {
    return this.collectorsService.startAll();
  }

  @Post('stop-all')
  @RequirePermissions(PERMISSIONS.COLLECTORS_STOP)
  @UseGuards(ReAuthGuard)
  @AuditAction('COLLECTOR.STOP_ALL', 'system')
  async stopAll(@Body() _dto: BulkActionDto) {
    return this.collectorsService.stopAll();
  }

  @Get(':nodeId')
  @RequirePermissions(PERMISSIONS.NODES_READ)
  async getStatus(@Param('nodeId') nodeId: string) {
    return this.collectorsService.getStatus(nodeId);
  }

  @Get(':nodeId/runs')
  @RequirePermissions(PERMISSIONS.NODES_READ)
  async getRunHistory(@Param('nodeId') nodeId: string) {
    return this.collectorsService.getRunHistory(nodeId);
  }

  @Post(':nodeId/start')
  @RequirePermissions(PERMISSIONS.COLLECTORS_START)
  @AuditAction('COLLECTOR.START', 'collector')
  async start(@Param('nodeId') nodeId: string) {
    return this.collectorsService.start(nodeId);
  }

  @Post(':nodeId/stop')
  @RequirePermissions(PERMISSIONS.COLLECTORS_STOP)
  @AuditAction('COLLECTOR.STOP', 'collector')
  async stop(@Param('nodeId') nodeId: string) {
    return this.collectorsService.stop(nodeId);
  }

  @Post(':nodeId/restart')
  @RequirePermissions(PERMISSIONS.COLLECTORS_RESTART)
  @AuditAction('COLLECTOR.RESTART', 'collector')
  async restart(@Param('nodeId') nodeId: string) {
    return this.collectorsService.restart(nodeId);
  }

  @Post(':nodeId/pause')
  @RequirePermissions(PERMISSIONS.COLLECTORS_STOP)
  @AuditAction('COLLECTOR.PAUSE', 'collector')
  async pause(@Param('nodeId') nodeId: string) {
    return this.collectorsService.pause(nodeId);
  }

  @Post(':nodeId/resume')
  @RequirePermissions(PERMISSIONS.COLLECTORS_START)
  @AuditAction('COLLECTOR.RESUME', 'collector')
  async resume(@Param('nodeId') nodeId: string) {
    return this.collectorsService.resume(nodeId);
  }
}
