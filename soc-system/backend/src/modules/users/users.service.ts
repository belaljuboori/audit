import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { ROLE_NAMES } from '../rbac/permissions.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

const userWithRolesInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Maps the Prisma row (with nested roles/permissions) into the flat shape used for AuthZ decisions. */
  private toAuthenticatedUser(
    user: Awaited<ReturnType<UsersService['findByUsernameRaw']>>,
  ): AuthenticatedUser | null {
    if (!user || user.status !== 'ACTIVE') return null;
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    );
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions,
    };
  }

  private findByUsernameRaw(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: userWithRolesInclude,
    });
  }

  private findByIdRaw(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithRolesInclude,
    });
  }

  async findRawForAuth(username: string) {
    return this.findByUsernameRaw(username);
  }

  async getAuthenticatedProfile(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.findByIdRaw(userId);
    return this.toAuthenticatedUser(user);
  }

  async list() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role.name),
    }));
  }

  async create(params: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    roleIds: string[];
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: params.username }, { email: params.email }] },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A user with this username or email already exists');
    }

    const passwordHash = await argon2.hash(params.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        username: params.username,
        email: params.email,
        passwordHash,
        fullName: params.fullName,
        mustChangePassword: true,
        roles: {
          create: params.roleIds.map((roleId) => ({ roleId })),
        },
      },
      select: { id: true, username: true, email: true, fullName: true },
    });

    return user;
  }

  /**
   * Replaces a user's full role set. Enforces that only an actor who already
   * holds the Super Admin role may grant or revoke Super Admin — independent
   * of whatever permission bundle a custom role happens to carry, per the
   * hard requirement "SOC Admin cannot change Super Admin".
   */
  async replaceRoles(actor: AuthenticatedUser, targetUserId: string, roleIds: string[]) {
    const target = await this.findByIdRaw(targetUserId);
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs do not exist');
    }

    const targetCurrentlySuperAdmin = target.roles.some(
      (ur) => ur.role.name === ROLE_NAMES.SUPER_ADMIN,
    );
    const targetWillBeSuperAdmin = roles.some((r) => r.name === ROLE_NAMES.SUPER_ADMIN);
    const superAdminChanging = targetCurrentlySuperAdmin !== targetWillBeSuperAdmin;

    if (superAdminChanging && !actor.roles.includes(ROLE_NAMES.SUPER_ADMIN)) {
      throw new ForbiddenException('Only a Super Admin may grant or revoke the Super Admin role');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: targetUserId, roleId, assignedBy: actor.id })),
      }),
    ]);

    return this.getAuthenticatedProfile(targetUserId);
  }

  async recordSuccessfulLogin(userId: string, ip: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
    });
  }

  async recordFailedLogin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginCount: true },
    });
    const newCount = (user?.failedLoginCount ?? 0) + 1;
    const shouldLock = newCount >= this.config.loginMaxAttempts;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + this.config.loginLockoutMinutes * 60_000)
          : undefined,
      },
    });

    return { locked: shouldLock };
  }

  isLocked(user: { lockedUntil: Date | null }): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }
}
