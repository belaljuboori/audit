import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { ListNodesQueryDto } from './dto/list-nodes-query.dto';
import { RotateCredentialDto } from './dto/rotate-credential.dto';
import { DeleteNodeDto } from './dto/delete-node.dto';
import { ConfirmActionDto } from '../../common/dto/confirm-action.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReAuthGuard } from '../../common/guards/re-auth.guard';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('nodes')
@ApiBearerAuth()
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.NODES_READ)
  async findAll(@Query() query: ListNodesQueryDto) {
    return this.nodesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.NODES_READ)
  async findOne(@Param('id') id: string) {
    return this.nodesService.findOneOrThrow(id);
  }

  @Get(':id/health-history')
  @RequirePermissions(PERMISSIONS.NODES_READ)
  async healthHistory(@Param('id') id: string) {
    return this.nodesService.healthHistory(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.NODES_CREATE)
  @AuditAction('NODE.CREATE', 'node')
  async create(@Body() dto: CreateNodeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.nodesService.create(dto, actor.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.NODES_UPDATE)
  @AuditAction('NODE.UPDATE', 'node')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNodeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.nodesService.update(id, dto, actor.id);
  }

  @Post(':id/enable')
  @RequirePermissions(PERMISSIONS.NODES_UPDATE)
  @AuditAction('NODE.ENABLE', 'node')
  async enable(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.nodesService.setEnabled(id, true, actor.id);
  }

  @Post(':id/disable')
  @RequirePermissions(PERMISSIONS.NODES_UPDATE)
  @AuditAction('NODE.DISABLE', 'node')
  async disable(
    @Param('id') id: string,
    @Body() _dto: ConfirmActionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.nodesService.setEnabled(id, false, actor.id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.NODES_DELETE)
  @UseGuards(ReAuthGuard)
  @AuditAction('NODE.DELETE', 'node')
  async remove(@Param('id') id: string, @Body() _dto: DeleteNodeDto) {
    await this.nodesService.remove(id);
    return { success: true };
  }

  @Post(':id/rotate-credential')
  @RequirePermissions(PERMISSIONS.NODES_UPDATE)
  @UseGuards(ReAuthGuard)
  @AuditAction('NODE.ROTATE_CREDENTIAL', 'node')
  async rotateCredential(@Param('id') id: string, @Body() dto: RotateCredentialDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.nodesService.rotateCredential(id, dto, actor.id);
  }

  @Post(':id/test-connection')
  @RequirePermissions(PERMISSIONS.NODES_TEST)
  @AuditAction('NODE.TEST_CONNECTION', 'node')
  async testConnection(@Param('id') id: string) {
    return this.nodesService.testConnection(id);
  }
}
