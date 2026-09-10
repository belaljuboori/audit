import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';

export interface IssuedRefreshToken {
  rawToken: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * Refresh tokens are opaque random values; only their SHA-256 hash is ever
 * persisted. Rotation-with-reuse-detection: each token belongs to a
 * "family" (one per login). Using a token marks it revoked and creates its
 * successor in the same family. If a token that is already revoked is
 * presented again, that is a signal of theft/replay — the entire family is
 * revoked and the caller must re-authenticate.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async issue(userId: string, ip: string | null, userAgent: string | null): Promise<IssuedRefreshToken> {
    return this.issueInFamily(userId, randomUUID(), ip, userAgent);
  }

  private async issueInFamily(
    userId: string,
    familyId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<IssuedRefreshToken> {
    const rawToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(rawToken),
        familyId,
        expiresAt,
        ipAddress: ip,
        userAgent,
      },
    });

    return { rawToken, familyId, expiresAt };
  }

  /**
   * Validates and rotates a presented refresh token. Throws UnauthorizedException
   * on any invalid, expired, or reused token (after revoking the family on reuse).
   */
  async rotate(
    rawToken: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{ userId: string; issued: IssuedRefreshToken }> {
    const tokenHash = this.hash(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      // Reuse of an already-rotated-out token: treat as compromise.
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException('Refresh token reuse detected — session revoked');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const issued = await this.issueInFamily(existing.userId, existing.familyId, ip, userAgent);

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: (
          await this.prisma.refreshToken.findUnique({
            where: { tokenHash: this.hash(issued.rawToken) },
            select: { id: true },
          })
        )?.id,
      },
    });

    return { userId: existing.userId, issued };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByRawToken(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (existing) {
      await this.revokeFamily(existing.familyId);
    }
  }
}
