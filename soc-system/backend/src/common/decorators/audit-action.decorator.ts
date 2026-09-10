import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionMetadata {
  action: string;
  targetType?: string;
}

/** Marks a route so AuditLogInterceptor records every call (success or failure) to it. */
export const AuditAction = (action: string, targetType?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, targetType } as AuditActionMetadata);
