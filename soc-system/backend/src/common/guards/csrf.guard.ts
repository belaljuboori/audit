import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

export const CSRF_COOKIE_NAME = 'soc_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Double-submit-cookie CSRF check for the two endpoints that authenticate via
 * an HttpOnly cookie (refresh, logout) rather than an Authorization header.
 * Bearer-token routes don't need this — a cross-site form can't read or set
 * an Authorization header — but a cookie is sent automatically by the
 * browser, so those two routes must verify the caller can also read a
 * non-HttpOnly cookie (which a cross-origin page cannot).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }

    return true;
  }
}
