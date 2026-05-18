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
  MAIL_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT!: number;

  @IsString()
  @IsNotEmpty()
  MAIL_USER!: string;

  @IsString()
  @IsNotEmpty()
  MAIL_PASS!: string;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  VERIFICATION_TOKEN_TTL_HOURS: number = 24;
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
