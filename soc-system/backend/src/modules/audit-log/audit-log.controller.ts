import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  async findRecent(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.auditLogService.findRecent(limit ?? 50);
  }
}
