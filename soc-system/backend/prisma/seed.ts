import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_NAMES,
} from '../src/modules/rbac/permissions.constants';

const prisma = new PrismaClient();

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'nodes.read': 'View configured monitoring nodes',
  'nodes.create': 'Add new monitoring nodes',
  'nodes.update': 'Edit existing monitoring nodes',
  'nodes.delete': 'Delete monitoring nodes',
  'nodes.test': 'Run the node connection test workflow',
  'collectors.start': 'Start a data collector',
  'collectors.stop': 'Stop a data collector',
  'collectors.restart': 'Restart a data collector',
  'reports.generate': 'Generate reports',
  'reports.download': 'Download generated reports',
  'compliance.manage': 'Manage compliance rules and findings',
  'users.manage': 'Create, edit, disable and assign roles to users',
  'roles.manage': 'Manage roles and their permission bundles',
  'audit.read': 'View the administrative audit log',
  'system.settings.manage': 'View and change system-wide settings',
};

async function main() {
  console.log('Seeding permissions...');
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] ?? key },
      update: { description: PERMISSION_DESCRIPTIONS[key] ?? key },
    });
  }

  console.log('Seeding roles...');
  const roleDescriptions: Record<string, string> = {
    [ROLE_NAMES.SUPER_ADMIN]: 'Full system access, including user, node and system administration.',
    [ROLE_NAMES.SOC_ADMIN]: 'Operates monitoring, collectors, alerts and reports. Cannot manage users or secrets.',
    [ROLE_NAMES.SOC_ANALYST]: 'Views dashboards and events, manages incidents and generates in-scope reports.',
    [ROLE_NAMES.COMPLIANCE_AUDITOR]: 'Read-only access to compliance results, evidence and reports.',
    [ROLE_NAMES.VIEWER]: 'Read-only access to permitted dashboards.',
  };

  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description: roleDescriptions[roleName], isSystem: true },
      update: { description: roleDescriptions[roleName], isSystem: true },
    });

    // Reset and re-apply this role's permission bundle so re-running the seed
    // (e.g. after PERMISSIONS catalog changes) keeps system roles in sync.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys as string[] } },
    });

    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
  }

  console.log('Seeding bootstrap Super Admin user...');
  const existingSuperAdmins = await prisma.user.count({
    where: { roles: { some: { role: { name: ROLE_NAMES.SUPER_ADMIN } } } },
  });

  if (existingSuperAdmins === 0) {
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { name: ROLE_NAMES.SUPER_ADMIN },
    });

    const bootstrapPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');
    const passwordHash = await argon2.hash(bootstrapPassword, { type: argon2.argon2id });

    const admin = await prisma.user.create({
      data: {
        username: process.env.SEED_SUPER_ADMIN_USERNAME ?? 'admin',
        email: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@bank.local',
        fullName: 'Bootstrap Super Admin',
        passwordHash,
        mustChangePassword: true,
        roles: { create: [{ roleId: superAdminRole.id }] },
      },
    });

    console.log('─'.repeat(72));
    console.log(`Bootstrap Super Admin created: ${admin.username}`);
    if (!process.env.SEED_SUPER_ADMIN_PASSWORD) {
      console.log(`Generated one-time password: ${bootstrapPassword}`);
      console.log('This password is shown only once and is NOT stored anywhere in plaintext.');
    }
    console.log('The account is flagged mustChangePassword=true.');
    console.log('─'.repeat(72));
  } else {
    console.log('A Super Admin already exists — skipping bootstrap user creation.');
  }

  console.log('Seeding default system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'auth.login_max_attempts' },
    create: {
      key: 'auth.login_max_attempts',
      value: 5,
      description: 'Failed login attempts before an account is temporarily locked.',
    },
    update: {},
  });
  await prisma.systemSetting.upsert({
    where: { key: 'auth.login_lockout_minutes' },
    create: {
      key: 'auth.login_lockout_minutes',
      value: 15,
      description: 'Lockout duration in minutes after exceeding max failed login attempts.',
    },
    update: {},
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
