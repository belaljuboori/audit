import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CollectorsService } from './collectors.service';
import { CollectorsController } from './collectors.controller';
import { CollectorHeartbeatProcessor } from './collector-heartbeat.processor';
import { CollectorLockService } from './collector-lock.service';
import { COLLECTOR_HEARTBEAT_QUEUE } from './collectors.constants';
import { NodesModule } from '../nodes/nodes.module';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { ReAuthGuard } from '../../common/guards/re-auth.guard';

@Module({
  imports: [
    BullModule.registerQueue({ name: COLLECTOR_HEARTBEAT_QUEUE }),
    NodesModule,
    UsersModule,
    AuditLogModule,
    SystemSettingsModule,
  ],
  controllers: [CollectorsController],
  providers: [CollectorsService, CollectorHeartbeatProcessor, CollectorLockService, ReAuthGuard],
  exports: [CollectorsService],
})
export class CollectorsModule {}
