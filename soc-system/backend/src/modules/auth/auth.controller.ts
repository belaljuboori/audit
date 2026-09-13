import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppConfigService } from '../../config/app-config.service';
import { CsrfGuard, CSRF_COOKIE_NAME } from '../../common/guards/csrf.guard';
import { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  private setSessionCookies(res: Response, result: LoginResult) {
    res.cookie(this.config.refreshCookieName, result.refreshToken, {
      ...this.authService.refreshCookieOptions,
      expires: result.refreshTokenExpiresAt,
    });

    // Path is deliberately "/" (unlike the refresh-token cookie) — this
    // cookie must be readable via document.cookie from anywhere in the SPA
    // so the frontend can echo it back as the X-CSRF-Token header, not just
    // sent automatically like the HttpOnly refresh cookie is.
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: this.config.isProduction,
      sameSite: 'strict',
      path: '/',
      expires: result.refreshTokenExpiresAt,
    });
  }

  @Public()
  @Post('login')
  // Read directly from process.env (not AppConfigService) because decorator
  // metadata is evaluated at class-definition time, before Nest's DI
  // container exists. Kept separate from the global throttle so login can be
  // rate-limited more tightly than the rest of the API without env changes
  // affecting every other route.
  @Throttle({
    default: {
      limit: Number(process.env.AUTH_LOGIN_THROTTLE_LIMIT ?? 10),
      ttl: Number(process.env.AUTH_LOGIN_THROTTLE_TTL_SECONDS ?? 60) * 1000,
    },
  })
  @AuditAction('AUTH.LOGIN', 'user')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.username, dto.password, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    this.setSessionCookies(res, result);

    return { accessToken: this.accessTokenResponse(result), user: result.user };
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('refresh')
  @AuditAction('AUTH.REFRESH', 'user')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[this.config.refreshCookieName];
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token presented');
    }

    const result = await this.authService.refresh(rawToken, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    this.setSessionCookies(res, result);

    return { accessToken: this.accessTokenResponse(result), user: result.user };
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('logout')
  @AuditAction('AUTH.LOGOUT', 'user')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[this.config.refreshCookieName];
    if (rawToken) {
      await this.authService.logout(rawToken);
    }
    res.clearCookie(this.config.refreshCookieName, { path: '/api/v1/auth' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private accessTokenResponse(result: LoginResult) {
    return result.accessToken;
  }
}
