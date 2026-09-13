import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/** Marks a route as exempt from the global JwtAuthGuard (e.g. login, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
