import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';

/**
 * Requires the caller to re-submit their current password in the request
 * body (`currentPassword`) for a handler marked sensitive — node deletion,
 * credential rotation, start-all/stop-all, maintenance mode. A valid access
 * token alone (which can persist for its 15-minute lifetime after a user
 * walks away from an unlocked screen) is not sufficient authorization for
 * these operations.
 */
@Injectable()
export class ReAuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const currentPassword: unknown = request.body?.currentPassword;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      throw new ForbiddenException('This action requires re-entering your current password');
    }

    const valid = await this.usersService.verifyPassword(user.id, currentPassword);
    if (!valid) {
      throw new ForbiddenException('Password confirmation failed');
    }

    return true;
  }
}
