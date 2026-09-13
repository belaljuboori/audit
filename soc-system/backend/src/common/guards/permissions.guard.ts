import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionKey } from '../../modules/rbac/permissions.constants';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

/**
 * Deny-by-default authorization guard. A route with no @RequirePermissions()
 * metadata is allowed through (authentication alone is enough); a route that
 * declares permissions requires the authenticated user to hold ALL of them.
 * Frontend visibility is never the enforcement boundary — this guard is.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userPermissions = new Set(user.permissions);
    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }

    return true;
  }
}
