/**
 * Central permission-key catalog. These are the atoms RBAC decisions are made
 * from; Roles (DB rows, editable by Super Admin) are just named bundles of
 * these keys. New modules in later phases add their own keys here rather than
 * inventing ad-hoc strings in controllers.
 */
export const PERMISSIONS = {
  NODES_READ: 'nodes.read',
  NODES_CREATE: 'nodes.create',
  NODES_UPDATE: 'nodes.update',
  NODES_DELETE: 'nodes.delete',
  NODES_TEST: 'nodes.test',

  COLLECTORS_START: 'collectors.start',
  COLLECTORS_STOP: 'collectors.stop',
  COLLECTORS_RESTART: 'collectors.restart',

  REPORTS_GENERATE: 'reports.generate',
  REPORTS_DOWNLOAD: 'reports.download',

  COMPLIANCE_MANAGE: 'compliance.manage',

  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',

  AUDIT_READ: 'audit.read',

  SYSTEM_SETTINGS_MANAGE: 'system.settings.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS);

export const ROLE_NAMES = {
  SUPER_ADMIN: 'Super Admin',
  SOC_ADMIN: 'SOC Admin',
  SOC_ANALYST: 'SOC Analyst',
  COMPLIANCE_AUDITOR: 'Compliance Auditor',
  VIEWER: 'Viewer',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/** Default permission bundles per role, per the spec's RBAC section. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [ROLE_NAMES.SUPER_ADMIN]: [...ALL_PERMISSION_KEYS],
  [ROLE_NAMES.SOC_ADMIN]: [
    PERMISSIONS.NODES_READ,
    PERMISSIONS.NODES_TEST,
    PERMISSIONS.COLLECTORS_START,
    PERMISSIONS.COLLECTORS_STOP,
    PERMISSIONS.COLLECTORS_RESTART,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_DOWNLOAD,
    PERMISSIONS.COMPLIANCE_MANAGE,
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLE_NAMES.SOC_ANALYST]: [
    PERMISSIONS.NODES_READ,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_DOWNLOAD,
  ],
  [ROLE_NAMES.COMPLIANCE_AUDITOR]: [PERMISSIONS.REPORTS_DOWNLOAD],
  [ROLE_NAMES.VIEWER]: [],
};
