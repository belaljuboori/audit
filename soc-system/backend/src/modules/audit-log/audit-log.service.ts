import { Injectable, Logger } from '@nestjs/common';
import { AuditResult, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface RecordAuditEntryInput {
  actorUserId?: string | null;
  actorUsernameSnapshot?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: AuditResult;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append-only audit trail. The `soc_app` MariaDB user is granted SELECT+INSERT
 * only on audit_logs (see docker/mariadb/init/01-app-user.sql) — there is no
 * update()/delete() method here because the DB would reject it even if there
 * were, and no code path in this service ever attempts one.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditEntryInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: entry.actorUserId ?? null,
          actorUsernameSnapshot: entry.actorUsernameSnapshot ?? null,
          action: entry.action,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          result: entry.result,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      // Audit logging must never crash the request it is observing, but a
      // failure here is itself a security-relevant event worth a loud log.
      this.logger.error(
        `Failed to write audit log entry for action "${entry.action}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findRecent(limit = 50, cursorId?: bigint) {
    return this.prisma.auditLog.findMany({
      take: limit,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: { id: 'desc' },
      select: {
        id: true,
        actorUserId: true,
        actorUsernameSnapshot: true,
        action: true,
        targetType: true,
        targetId: true,
        result: true,
        ipAddress: true,
        createdAt: true,
      },
    });
  }
}
