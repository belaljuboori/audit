import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from '../../database/prisma.service';

describe('PrismaHealthIndicator', () => {
  it('reports healthy when the database responds to SELECT 1', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]) } as unknown as PrismaService;
    const indicator = new PrismaHealthIndicator(prisma);

    const result = await indicator.isHealthy('database');

    expect(result.database.status).toBe('up');
  });

  it('reports degraded/unhealthy (throws HealthCheckError) when the database is unreachable — the system must not silently claim "operational" during a real MariaDB outage', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
    } as unknown as PrismaService;
    const indicator = new PrismaHealthIndicator(prisma);

    await expect(indicator.isHealthy('database')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
