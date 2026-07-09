import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolves the frontend URL used to build outbound links (e.g. email verification).
 *
 * - When the request `Origin` header is provided and matches the configured
 *   whitelist (FRONTEND_URL_PATTERNS comma-separated regexes + exact match on
 *   FRONTEND_URL), that origin is returned.
 * - Otherwise FRONTEND_URL is used as a safe fallback.
 *
 * The whitelist prevents open-redirect / phishing by ensuring we never trust
 * an arbitrary attacker-supplied Origin.
 */
@Injectable()
export class FrontendUrlResolver {
  private readonly logger = new Logger(FrontendUrlResolver.name);
  private readonly fallback: string;
  private readonly patterns: RegExp[];

  constructor(config: ConfigService) {
    this.fallback = config.getOrThrow<string>('FRONTEND_URL');
    const raw = config.get<string>('FRONTEND_URL_PATTERNS') ?? '';
    const compiled = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => {
        try {
          return new RegExp(p);
        } catch (err) {
          this.logger.warn(
            `Ignoring invalid FRONTEND_URL_PATTERNS entry "${p}": ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          return null;
        }
      })
      .filter((r): r is RegExp => r !== null);

    const fallbackOriginRegex = (() => {
      try {
        const origin = new URL(this.fallback).origin;
        return new RegExp(`^${escapeRegex(origin)}$`);
      } catch {
        return null;
      }
    })();

    this.patterns = fallbackOriginRegex
      ? [fallbackOriginRegex, ...compiled]
      : compiled;
  }

  resolve(origin: string | undefined | null): string {
    if (!origin) return this.fallback;
    if (this.patterns.some((r) => r.test(origin))) {
      return origin;
    }
    this.logger.warn(
      `Rejected non-whitelisted Origin "${origin}", falling back to FRONTEND_URL`,
    );
    return this.fallback;
  }
}
