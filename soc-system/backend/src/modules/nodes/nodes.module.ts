import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { TestConnectionService } from './test-connection.service';
import { UsersModule } from '../users/users.module';
import { ReAuthGuard } from '../../common/guards/re-auth.guard';

@Module({
  imports: [UsersModule], // ReAuthGuard needs UsersService.verifyPassword
  controllers: [NodesController],
  providers: [NodesService, TestConnectionService, ReAuthGuard],
  exports: [NodesService, TestConnectionService],
})
export class NodesModule {}
