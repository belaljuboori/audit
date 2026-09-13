import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';

const LOCK_TTL_MS = 3000;

/**
 * Short-lived Redis lock preventing a double-click on the same lifecycle
 * action (start/stop/restart/pause/resume) for the same collector from
 * being processed twice concurrently — per the spec's "prevent repeated
 * clicks" requirement for these controls.
 */
@Injectable()
export class CollectorLockService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: AppConfigService) {
    const { host, port, password, db } = config.redis;
    this.client = new Redis({ host, port, password, db });
  }

  /** Returns true if the lock was acquired, false if another action is already in flight. */
  async acquire(nodeId: string): Promise<boolean> {
    const result = await this.client.set(`collector-lock:${nodeId}`, '1', 'PX', LOCK_TTL_MS, 'NX');
    return result === 'OK';
  }

  async release(nodeId: string): Promise<void> {
    await this.client.del(`collector-lock:${nodeId}`);
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
