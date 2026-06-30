import 'cookie-session';

declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      userId?: number | null;
      passwordVersion?: number | null;
    }
  }
}

export {};
