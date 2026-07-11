import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;

  @IsString()
  @IsNotEmpty()
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

  /** PostgreSQL connection string. */
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  /** Comma-separated origins; defaults to FRONTEND_URL when omitted. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

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
  FRONTEND_URL_PATTERNS?: string;

  /** Run pending TypeORM migrations on app startup (staging/production). */
  @IsOptional()
  RUN_MIGRATIONS?: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, {
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
