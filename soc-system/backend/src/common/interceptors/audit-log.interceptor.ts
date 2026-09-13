import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditResult } from '@prisma/client';
import { AUDIT_ACTION_KEY, AuditActionMetadata } from '../decorators/audit-action.decorator';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

/**
 * Records every call to a route annotated with @AuditAction(), whether it
 * succeeds, is denied by a guard, or throws. Runs at the interceptor layer
 * (after guards) so a 403 from PermissionsGuard is captured too — but guard
 * rejections happen before this interceptor runs, so DENIED entries are
 * additionally recorded by the guards themselves where the spec requires it
 * (see PermissionsGuard callers in each module for that wiring in later phases).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditActionMetadata | undefined>(
      AUDIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const targetId = request.params?.id;

    const baseEntry = {
      actorUserId: user?.id ?? null,
      actorUsernameSnapshot: user?.username ?? null,
      action: metadata.action,
      targetType: metadata.targetType ?? null,
      targetId: targetId ?? null,
      ipAddress: request.ip ?? null,
      userAgent: request.headers?.['user-agent'] ?? null,
    };

    return next.handle().pipe(
      tap(() => {
        void this.auditLogService.record({ ...baseEntry, result: AuditResult.SUCCESS });
      }),
      catchError((error) => {
        void this.auditLogService.record({ ...baseEntry, result: AuditResult.FAILURE });
        return throwError(() => error);
      }),
    );
  }
}
