import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars, NodeEnv } from '../config/env.validation';

export const FRONTEND_ORIGINS = Symbol('FRONTEND_ORIGINS');

export interface FrontendOrigins {
  readonly corsOrigins: readonly string[];
  allowsMutation(origin?: string): boolean;
  resolveLinkBase(origin?: string): string;
}

@Injectable()
export class ConfiguredFrontendOrigins implements FrontendOrigins {
  private readonly logger = new Logger(ConfiguredFrontendOrigins.name);
  readonly corsOrigins: readonly string[];
  private readonly fallback: string;
  private readonly fallbackOrigin: string;
  private readonly patterns: readonly RegExp[];
  private readonly production: boolean;

  constructor(config: ConfigService<EnvVars, true>) {
    this.fallback = config.get('FRONTEND_URL').replace(/\/$/, '');
    this.fallbackOrigin = new URL(this.fallback).origin;
    this.corsOrigins = config.get('CORS_ORIGINS').length
      ? config.get('CORS_ORIGINS')
      : [this.fallbackOrigin];
    this.patterns = config.get('FRONTEND_URL_PATTERNS');
    this.production = config.get('NODE_ENV') === NodeEnv.Production;
  }

  allowsMutation(origin?: string): boolean {
    return !this.production || (!!origin && this.corsOrigins.includes(origin));
  }

  resolveLinkBase(origin?: string): string {
    if (!origin) return this.fallback;
    if (
      this.isOrigin(origin) &&
      (origin === this.fallbackOrigin ||
        this.patterns.some((pattern) => pattern.test(origin)))
    ) {
      return origin;
    }
    this.logger.warn(
      `Rejected non-whitelisted Origin "${origin}", falling back to FRONTEND_URL`,
    );
    return this.fallback;
  }

  private isOrigin(value: string): boolean {
    try {
      return new URL(value).origin === value;
    } catch {
      return false;
    }
  }
}
