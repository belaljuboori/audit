import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import { AppConfigService } from '../../config/app-config.service';
import { AuthenticatedUser } from './types/authenticated-user.type';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUser;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  private signAccessToken(user: AuthenticatedUser): string {
    return this.jwtService.sign({ sub: user.id, username: user.username });
  }

  /**
   * Deliberately returns the same generic error for "no such user", "wrong
   * password", and "account locked" transitions where distinguishing them
   * would let an attacker enumerate valid usernames — the one exception is
   * an already-locked account, which is reported explicitly because at that
   * point the attacker (or legitimate user) already knows the account exists.
   */
  async login(username: string, password: string, ctx: RequestContext): Promise<LoginResult> {
    const user = await this.usersService.findRawForAuth(username);

    if (!user) {
      // Still perform a hash comparison against a dummy value to reduce
      // timing signal between "user does not exist" and "wrong password".
      await argon2.hash(password).catch(() => undefined);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (this.usersService.isLocked(user)) {
      throw new UnauthorizedException(
        'Account temporarily locked due to repeated failed login attempts',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid username or password');
    }

    await this.usersService.recordSuccessfulLogin(user.id, ctx.ip);

    const authenticatedUser = await this.usersService.getAuthenticatedProfile(user.id);
    if (!authenticatedUser) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const accessToken = this.signAccessToken(authenticatedUser);
    const issued = await this.refreshTokenService.issue(user.id, ctx.ip, ctx.userAgent);

    return {
      accessToken,
      refreshToken: issued.rawToken,
      refreshTokenExpiresAt: issued.expiresAt,
      user: authenticatedUser,
    };
  }

  async refresh(rawRefreshToken: string, ctx: RequestContext): Promise<LoginResult> {
    const { userId, issued } = await this.refreshTokenService.rotate(
      rawRefreshToken,
      ctx.ip,
      ctx.userAgent,
    );

    const user = await this.usersService.getAuthenticatedProfile(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists or is disabled');
    }

    const accessToken = this.signAccessToken(user);

    return {
      accessToken,
      refreshToken: issued.rawToken,
      refreshTokenExpiresAt: issued.expiresAt,
      user,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeByRawToken(rawRefreshToken);
  }

  get refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }
}
