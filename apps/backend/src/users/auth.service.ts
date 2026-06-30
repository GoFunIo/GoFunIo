import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { QueryFailedError } from 'typeorm';
import {
  generateVerificationToken,
  hashVerificationToken,
} from './verification-token.util';
import {
  USER_REGISTERED_EVENT,
  UserRegisteredEvent,
} from './events/user-registered.event';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from './events/password-reset-requested.event';

const scrypt = promisify(_scrypt);
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const UNIQUE_VIOLATION_CODES = new Set([
  'SQLITE_CONSTRAINT_UNIQUE',
  'SQLITE_CONSTRAINT',
  '23505',
]);

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const code = (err.driverError as { code?: string } | undefined)?.code;
  return code != null && UNIQUE_VIOLATION_CODES.has(code);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
  return salt + '.' + hash.toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
    private config: ConfigService,
  ) {}

  async signup(email: string, password: string, origin?: string) {
    const result = await hashPassword(password);

    const ttlHours = this.config.get<number>(
      'VERIFICATION_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    let user;
    try {
      user = await this.usersService.create(email, result, {
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: expiresAt,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BadRequestException('Email already in use');
      }
      throw err;
    }

    this.eventEmitter.emit(
      USER_REGISTERED_EVENT,
      new UserRegisteredEvent(user.id, user.email, token, origin),
    );

    return user;
  }

  async signin(email: string, password: string) {
    const [user] = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, storedHash] = user.password.split('.');
    if (!salt || !storedHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
    const stored = Buffer.from(storedHash, 'hex');

    if (stored.length !== hash.length || !timingSafeEqual(hash, stored)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    return user;
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashVerificationToken(token);
    const user =
      await this.usersService.findOneByVerificationTokenHash(tokenHash);

    if (
      !user ||
      user.isVerified ||
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
  }

  async resendVerification(email: string, origin?: string): Promise<void> {
    const [user] = await this.usersService.findByEmail(email);
    if (!user || user.isVerified) {
      return;
    }

    const ttlHours = this.config.get<number>(
      'VERIFICATION_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    await this.usersService.update(user.id, {
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: expiresAt,
    });

    this.eventEmitter.emit(
      USER_REGISTERED_EVENT,
      new UserRegisteredEvent(user.id, user.email, token, origin),
    );
  }

  async requestPasswordReset(email: string, origin?: string): Promise<void> {
    const [user] = await this.usersService.findByEmail(email);
    // ponytail: silent no-op for missing email (anti-enumeration); verified + unverified allowed
    if (!user) {
      return;
    }

    const ttlHours = this.config.get<number>(
      'PASSWORD_RESET_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    await this.usersService.update(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
    });

    this.eventEmitter.emit(
      PASSWORD_RESET_REQUESTED_EVENT,
      new PasswordResetRequestedEvent(
        user.id,
        user.email,
        token,
        ttlHours,
        origin,
      ),
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashVerificationToken(token);
    const password = await hashPassword(newPassword);
    const consumed = await this.usersService.consumePasswordResetToken(
      tokenHash,
      password,
    );

    if (!consumed) {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
