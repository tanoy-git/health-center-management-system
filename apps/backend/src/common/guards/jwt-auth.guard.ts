import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id || !user.sessionId) {
      throw new UnauthorizedException('Invalid user session');
    }

    // Verify session in Redis (allows forced logout / session invalidation)
    const isSessionActive = await this.redisService.isSessionActive(
      user.id,
      user.sessionId,
    );
    if (!isSessionActive) {
      throw new UnauthorizedException('Session expired or invalidated by administrator');
    }

    // Update session last active time
    await this.redisService.touchSession(user.id, user.sessionId);

    return true;
  }
}
