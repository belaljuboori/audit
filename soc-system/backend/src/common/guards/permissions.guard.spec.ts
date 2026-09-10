import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS } from '../../modules/rbac/permissions.constants';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

function contextWithUser(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function userWith(permissions: string[]): AuthenticatedUser {
  return {
    id: 'u1',
    username: 'test',
    email: 'test@bank.local',
    fullName: 'Test User',
    roles: ['SOC Analyst'],
    permissions,
  };
}

describe('PermissionsGuard', () => {
  function makeGuard(requiredPermissions: string[] | undefined) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
    } as unknown as Reflector;
    return new PermissionsGuard(reflector);
  }

  it('allows the request through when the route declares no required permissions', () => {
    const guard = makeGuard(undefined);
    expect(guard.canActivate(contextWithUser(userWith([])))).toBe(true);
  });

  it('denies a SOC Analyst (no nodes.create) from creating a node', () => {
    const guard = makeGuard([PERMISSIONS.NODES_CREATE]);
    const analyst = userWith([PERMISSIONS.NODES_READ, PERMISSIONS.REPORTS_GENERATE]);

    expect(() => guard.canActivate(contextWithUser(analyst))).toThrow(ForbiddenException);
  });

  it('denies a Viewer from downloading a report outside their granted permissions', () => {
    const guard = makeGuard([PERMISSIONS.REPORTS_DOWNLOAD]);
    const viewer = userWith([]);

    expect(() => guard.canActivate(contextWithUser(viewer))).toThrow(ForbiddenException);
  });

  it('allows a Super Admin holding the permission to manage nodes', () => {
    const guard = makeGuard([PERMISSIONS.NODES_CREATE]);
    const superAdmin = userWith([PERMISSIONS.NODES_CREATE, PERMISSIONS.USERS_MANAGE]);

    expect(guard.canActivate(contextWithUser(superAdmin))).toBe(true);
  });

  it('requires ALL declared permissions, not just one', () => {
    const guard = makeGuard([PERMISSIONS.NODES_READ, PERMISSIONS.NODES_DELETE]);
    const partial = userWith([PERMISSIONS.NODES_READ]);

    expect(() => guard.canActivate(contextWithUser(partial))).toThrow(ForbiddenException);
  });

  it('denies when there is no authenticated user on the request at all', () => {
    const guard = makeGuard([PERMISSIONS.NODES_READ]);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
