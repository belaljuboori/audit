import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../jwt-payload.type';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService, private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    });
  }

  /**
   * Resolves roles/permissions fresh from the database on every request
   * rather than trusting whatever was baked into the token at issuance —
   * a role change or account disable takes effect immediately, not after
   * the (short-lived) access token happens to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.getAuthenticatedProfile(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists or is disabled');
    }
    return user;
  }
}
