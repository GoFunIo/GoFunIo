import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Matches,
  MinLength,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class DatabaseEnv {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @Matches(/^[A-Za-z_][A-Za-z0-9_]*$/)
  DATABASE_SCHEMA?: string;

  @IsIn(['true', 'false'])
  DATABASE_SSL: 'true' | 'false' = 'false';

  @IsIn(['true', 'false'])
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'true' | 'false' = 'true';

  @IsIn(['true', 'false'])
  RUN_MIGRATIONS: 'true' | 'false' = 'false';
}

export class EnvVars extends DatabaseEnv {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  COOKIE_KEY!: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL!: string;

  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  VERIFICATION_TOKEN_TTL_HOURS: number = 24;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  PASSWORD_RESET_TOKEN_TTL_HOURS: number = 24;

  /** Exact origins used by CORS and mutation protection. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS!: string[];

  /**
   * Comma-separated regex patterns matched against the request `Origin` header
   * to decide which frontend host to use for outbound links (e.g. mail).
   * FRONTEND_URL is always implicitly allowed.
   *
   * Example for Netlify deploys:
   *   ^https:\/\/([\w-]+--)?my-app\.netlify\.app$
   */
  @IsOptional()
  @IsString()
  FRONTEND_URL_PATTERNS!: RegExp[];

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID!: string;
}

function validate<T extends object>(
  type: new () => T,
  config: Record<string, unknown>,
): T {
  const validated = plainToInstance(type, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      'Invalid environment configuration:\n' +
        errors.map((e) => e.toString()).join('\n'),
    );
  }

  return validated;
}

export function validateDatabaseEnv(
  config: Record<string, unknown>,
): DatabaseEnv {
  return validate(DatabaseEnv, config);
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = validate(EnvVars, config);
  const corsOrigins = String(config.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    try {
      if (new URL(origin).origin !== origin) throw new Error();
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
  }
  validated.CORS_ORIGINS = corsOrigins;
  validated.FRONTEND_URL_PATTERNS = String(config.FRONTEND_URL_PATTERNS ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch (error) {
        throw new Error(
          `Invalid FRONTEND_URL_PATTERNS entry "${pattern}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
  return validated;
}
