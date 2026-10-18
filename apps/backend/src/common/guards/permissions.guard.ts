import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Super Admin has unrestricted access to all endpoints
    if (user.role === 'SUPER_ADMIN' || user.role?.name === 'SUPER_ADMIN') {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
