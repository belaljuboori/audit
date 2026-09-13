import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CollectorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { CollectorLockService } from './collector-lock.service';
import { COLLECTOR_HEARTBEAT_QUEUE, MAINTENANCE_MODE_SETTING_KEY } from './collectors.constants';

export interface BulkActionResult {
  nodeId: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class CollectorsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(COLLECTOR_HEARTBEAT_QUEUE) private readonly queue: Queue,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly lockService: CollectorLockService,
  ) {}

  async isMaintenanceMode(): Promise<boolean> {
    const setting = await this.systemSettingsService.get(MAINTENANCE_MODE_SETTING_KEY);
    return setting?.value === true;
  }

  async setMaintenanceMode(enabled: boolean, actorId: string): Promise<{ enabled: boolean }> {
    await this.systemSettingsService.set(
      MAINTENANCE_MODE_SETTING_KEY,
      enabled,
      actorId,
      'When true, collectors cannot be started or resumed and existing ones are paused.',
    );

    if (enabled) {
      const running = await this.prisma.collector.findMany({ where: { status: 'RUNNING' } });
      for (const collector of running) {
        await this.pauseInternal(collector.nodeId);
      }
    }

    return { enabled };
  }

  private async withLock<T>(nodeId: string, action: () => Promise<T>): Promise<T> {
    const acquired = await this.lockService.acquire(nodeId);
    if (!acquired) {
      throw new ConflictException('Another lifecycle action for this collector is already in progress');
    }
    try {
      return await action();
    } finally {
      await this.lockService.release(nodeId);
    }
  }

  async start(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    return this.withLock(nodeId, () => this.startInternal(nodeId));
  }

  private async startInternal(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Node not found');
    if (!node.enabled) throw new ConflictException('Cannot start a collector for a disabled node');
    if (await this.isMaintenanceMode()) {
      throw new ConflictException('System is in maintenance mode — collectors cannot be started');
    }

    await this.queue.upsertJobScheduler(
      nodeId,
      { every: node.pollingIntervalSeconds * 1000 },
      { name: 'heartbeat', data: { nodeId } },
    );

    await this.prisma.collector.upsert({
      where: { nodeId },
      create: { nodeId, status: 'RUNNING', lastStartedAt: new Date() },
      update: { status: 'RUNNING', lastStartedAt: new Date(), lastError: null },
    });

    return { nodeId, status: 'RUNNING' };
  }

  async stop(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    return this.withLock(nodeId, () => this.stopInternal(nodeId));
  }

  private async stopInternal(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    const collector = await this.prisma.collector.findUnique({ where: { nodeId } });
    if (!collector) throw new NotFoundException('Collector not found for this node');

    // Gracefully — removeJobScheduler only prevents future ticks; it does
    // not interrupt a heartbeat job already in flight, which is left to run
    // to completion so no in-progress run result is lost.
    await this.queue.removeJobScheduler(nodeId);

    await this.prisma.collector.update({
      where: { nodeId },
      data: { status: 'STOPPED', lastStoppedAt: new Date() },
    });

    return { nodeId, status: 'STOPPED' };
  }

  async restart(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    return this.withLock(nodeId, async () => {
      await this.stopInternal(nodeId);
      return this.startInternal(nodeId);
    });
  }

  async pause(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    return this.withLock(nodeId, () => this.pauseInternal(nodeId));
  }

  private async pauseInternal(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    const collector = await this.prisma.collector.findUnique({ where: { nodeId } });
    if (!collector) throw new NotFoundException('Collector not found for this node');

    await this.queue.removeJobScheduler(nodeId);
    await this.prisma.collector.update({ where: { nodeId }, data: { status: 'PAUSED' } });

    return { nodeId, status: 'PAUSED' };
  }

  async resume(nodeId: string): Promise<{ nodeId: string; status: CollectorStatus }> {
    return this.withLock(nodeId, () => this.startInternal(nodeId));
  }

  async startAll(): Promise<BulkActionResult[]> {
    const nodes = await this.prisma.node.findMany({ where: { enabled: true } });
    const results: BulkActionResult[] = [];
    for (const node of nodes) {
      try {
        await this.start(node.id);
        results.push({ nodeId: node.id, success: true });
      } catch (error) {
        results.push({ nodeId: node.id, success: false, error: (error as Error).message });
      }
    }
    return results;
  }

  async stopAll(): Promise<BulkActionResult[]> {
    const collectors = await this.prisma.collector.findMany({
      where: { status: { in: ['RUNNING', 'PAUSED'] } },
    });
    const results: BulkActionResult[] = [];
    for (const collector of collectors) {
      try {
        await this.stop(collector.nodeId);
        results.push({ nodeId: collector.nodeId, success: true });
      } catch (error) {
        results.push({ nodeId: collector.nodeId, success: false, error: (error as Error).message });
      }
    }
    return results;
  }

  async getStatus(nodeId: string) {
    const collector = await this.prisma.collector.findUnique({ where: { nodeId } });
    if (!collector) throw new NotFoundException('Collector not found for this node');
    return collector;
  }

  async getRunHistory(nodeId: string, limit = 20) {
    const collector = await this.getStatus(nodeId);
    return this.prisma.collectorRun.findMany({
      where: { collectorId: collector.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
