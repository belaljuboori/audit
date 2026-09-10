import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  get nodeEnv() {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port() {
    return this.configService.get('PORT', { infer: true });
  }

  get appUrl() {
    return this.configService.get('APP_URL', { infer: true });
  }

  get databaseUrl() {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  /** Runtime DB connection should use the least-privilege app user when configured. */
  get databaseUrlForRuntime() {
    return this.configService.get('DATABASE_URL_APP', { infer: true }) ?? this.databaseUrl;
  }

  get redis() {
    return {
      host: this.configService.get('REDIS_HOST', { infer: true }),
      port: this.configService.get('REDIS_PORT', { infer: true }),
      password: this.configService.get('REDIS_PASSWORD', { infer: true }) || undefined,
    };
  }

  get jwtAccessSecret() {
    return this.configService.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtAccessTtl() {
    return this.configService.get('JWT_ACCESS_TTL', { infer: true });
  }

  get jwtRefreshTtlDays() {
    return this.configService.get('JWT_REFRESH_TTL_DAYS', { infer: true });
  }

  get refreshCookieName() {
    return this.configService.get('REFRESH_COOKIE_NAME', { infer: true });
  }

  get masterEncryptionKey() {
    return this.configService.get('MASTER_ENCRYPTION_KEY', { infer: true });
  }

  get loginMaxAttempts() {
    return this.configService.get('LOGIN_MAX_ATTEMPTS', { infer: true });
  }

  get loginLockoutMinutes() {
    return this.configService.get('LOGIN_LOCKOUT_MINUTES', { infer: true });
  }

  get throttle() {
    return {
      ttl: this.configService.get('THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
      limit: this.configService.get('THROTTLE_LIMIT', { infer: true }),
    };
  }

  get corsAllowedOrigins() {
    return this.configService
      .get('CORS_ALLOWED_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim());
  }

  get logLevel() {
    return this.configService.get('LOG_LEVEL', { infer: true });
  }

  get demoMode() {
    return this.configService.get('DEMO_MODE', { infer: true });
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }
}
