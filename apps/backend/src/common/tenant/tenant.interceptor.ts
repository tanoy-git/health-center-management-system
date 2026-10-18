import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Header override if super admin switches view, or user's assigned center
    const centerId =
      request.headers['x-center-id'] || user?.centerId || user?.center_id;
    const userId = user?.id || user?.sub;
    const role = user?.role?.name || user?.role || '';
    const permissions = user?.permissions || [];

    if (centerId || userId) {
      return new Observable((observer) => {
        TenantContext.run(
          {
            centerId: centerId as string,
            userId: userId as string,
            role: role as string,
            permissions: permissions as string[],
          },
          () => {
            next.handle().subscribe({
              next: (val) => observer.next(val),
              error: (err) => observer.error(err),
              complete: () => observer.complete(),
            });
          },
        );
      });
    }

    return next.handle();
  }
}
