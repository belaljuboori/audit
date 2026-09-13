import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CollectorRunResult } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TestConnectionService } from '../nodes/test-connection.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { COLLECTOR_HEARTBEAT_QUEUE } from './collectors.constants';

interface HeartbeatJobData {
  nodeId: string;
}

/**
 * Runs on every polling-interval tick for a RUNNING collector. This is the
 * generic Phase 2 heartbeat (connectivity only, via TestConnectionService)
 * that Phase 3+ device adapters extend into real data collection — the
 * lifecycle machinery (schedule, run history, error handling) built here
 * does not change when that happens.
 */
@Processor(COLLECTOR_HEARTBEAT_QUEUE)
export class CollectorHeartbeatProcessor extends WorkerHost {
  private readonly logger = new Logger(CollectorHeartbeatProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly testConnectionService: TestConnectionService,
    private readonly auditLogService: AuditLogService,
  ) {
    super();
  }

  async process(job: Job<HeartbeatJobData>): Promise<void> {
    const { nodeId } = job.data;

    const collector = await this.prisma.collector.findUnique({ where: { nodeId } });
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });

    // The node/collector may have been deleted or disabled since this
    // repeatable job was scheduled — skip quietly rather than error loudly
    // for a race that isn't actually a failure.
    if (!collector || !node || !node.enabled || collector.status !== 'RUNNING') {
      return;
    }

    const run = await this.prisma.collectorRun.create({
      data: { collectorId: collector.id },
    });

    try {
      const heartbeat = await this.testConnectionService.runHeartbeat(node);

      await this.prisma.$transaction([
        this.prisma.collectorRun.update({
          where: { id: run.id },
          data: {
            finishedAt: new Date(),
            result: heartbeat.status === 'UNHEALTHY' ? CollectorRunResult.FAILURE : CollectorRunResult.SUCCESS,
            errorMessage: heartbeat.errorMessage,
            eventsCollected: 0, // no real event collection exists until a Phase 3+ adapter runs behind this
          },
        }),
        this.prisma.collector.update({
          where: { id: collector.id },
          data: { lastHeartbeatAt: new Date(), lastError: heartbeat.errorMessage },
        }),
        this.prisma.node.update({
          where: { id: nodeId },
          data: {
            currentHealth: heartbeat.status,
            currentLatencyMs: heartbeat.latencyMs,
            lastCollectionAt: new Date(),
            lastError: heartbeat.errorMessage,
            ...(heartbeat.status === 'HEALTHY' ? { lastSuccessfulConnectionAt: new Date() } : {}),
          },
        }),
      ]);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Heartbeat job failed for node ${nodeId}`, (error as Error).stack);

      await this.prisma.$transaction([
        this.prisma.collectorRun.update({
          where: { id: run.id },
          data: { finishedAt: new Date(), result: CollectorRunResult.FAILURE, errorMessage: message },
        }),
        this.prisma.collector.update({
          where: { id: collector.id },
          data: { status: 'ERROR', lastError: message },
        }),
      ]);

      // Alert-style record: a collector that stops running without an
      // explicit stop/pause request from an admin is exactly the case the
      // spec calls out ("send an alert when a Collector stops unexpectedly").
      // A full Alerting Engine is a later module; recording it loudly in the
      // audit trail is the honest Phase 2 equivalent.
      await this.auditLogService.record({
        action: 'COLLECTOR.UNEXPECTED_ERROR',
        targetType: 'collector',
        targetId: collector.id,
        result: 'FAILURE',
        metadata: { nodeId, message },
      });

      throw error;
    }
  }

  @OnWorkerEvent('error')
  onWorkerError(error: Error) {
    this.logger.error('Collector heartbeat worker error', error.stack);
  }
}
