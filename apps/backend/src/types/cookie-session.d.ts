import 'cookie-session';

declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      userId?: string | null;
      passwordVersion?: number | null;
      currentCompanyId?: string | null;
    }
  }
}

export {};
