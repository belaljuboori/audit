import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../../modules/rbac/permissions.constants';

export const PERMISSIONS_KEY = 'required_permissions';

/** Marks a route as requiring ALL of the given permission keys (deny-by-default). */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
