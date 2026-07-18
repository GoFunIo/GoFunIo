import { Inject, Injectable } from '@nestjs/common';
import type { SessionData } from '../types/session.types';
import {
  SESSION_USER_READER,
  type SessionUserReader,
} from './session-user-reader';
import type { SessionPrincipal } from './session-principal';

@Injectable()
export class SessionsService {
  constructor(
    @Inject(SESSION_USER_READER) private readonly users: SessionUserReader,
  ) {}

  async establish(session: SessionData, userId: string): Promise<void> {
    const user = await this.users.findActiveById(userId);
    if (!user) {
      this.clear(session);
      throw new Error('Cannot establish session for inactive user');
    }

    session.userId = user.id;
    session.passwordVersion = user.passwordVersion;
    session.currentCompanyId = user.companyId;
  }

  async authenticate(session: SessionData): Promise<SessionPrincipal | null> {
    const user = session.userId
      ? await this.users.findActiveById(session.userId)
      : null;
    if (
      !user ||
      session.passwordVersion !== user.passwordVersion ||
      session.currentCompanyId !== user.companyId
    ) {
      this.clear(session);
      return null;
    }

    return { id: user.id, companyId: user.companyId, role: user.role };
  }

  clear(session: SessionData): void {
    session.userId = null;
    session.passwordVersion = null;
    session.currentCompanyId = null;
  }
}
