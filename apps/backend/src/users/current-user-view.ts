import type { SessionPrincipal } from './session-principal';
import type { UserAccount } from './user-account';

export type CurrentUserView = UserAccount &
  Pick<SessionPrincipal, 'companyId' | 'role'>;
