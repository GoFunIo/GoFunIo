import {
  NestInterceptor,
  CallHandler,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { Observable } from 'rxjs';
import { SessionData } from 'src/types/session.types';

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private usersService: UsersService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { session: SessionData }>();
    const session = request.session;
    if (!session) {
      return next.handle();
    }

    const { userId } = session;

    if (userId) {
      const user = await this.usersService.findOneById(userId);

      if (!user) {
        session.userId = null;
        session.passwordVersion = null;
        return next.handle();
      }

      const sessionVersion = session.passwordVersion ?? 1;
      if (sessionVersion !== user.passwordVersion) {
        session.userId = null;
        session.passwordVersion = null;
        return next.handle();
      }

      request.session.user = user;
    }

    return next.handle();
  }
}
