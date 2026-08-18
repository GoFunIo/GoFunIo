import type { Request } from 'express';

/** Cookie session from `cookie-session` (see `cookie-session.d.ts`). */
export type SessionData = NonNullable<Request['session']>;
