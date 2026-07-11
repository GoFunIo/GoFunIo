import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { DataSource, QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
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
import { Company } from '../companies/companies.entity';
import { User, UserRole } from './users.entity';

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
    private dataSource: DataSource,
  ) {}

  async signup(email: string, password: string, origin?: string) {
    const result = await hashPassword(password);

    const ttlHours = this.config.get<number>(
      'VERIFICATION_TOKEN_TTL_HOURS',
      24,
    );
    const { token, tokenHash, expiresAt } = generateVerificationToken(ttlHours);

    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        // placeholder until company profile filled in settings
        const company = manager.create(Company, { name: 'Moja firma' });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          companyId: savedCompany.id,
          email,
          password: result,
          role: UserRole.ADMIN,
          verificationTokenHash: tokenHash,
          verificationTokenExpiresAt: expiresAt,
        });

        return manager.save(newUser);
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
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password) {
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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email not verified');
    }

    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    return user;
  }

  async signInWithGoogle(credential: string): Promise<User> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')!;

    let payload: TokenPayload | undefined;

    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException('Invalid Google token');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid Google token');
    }

    const { sub: googleId, email } = payload;

    const existingByGoogle =
      await this.usersService.findOneByGoogleId(googleId);
    if (existingByGoogle) {
      await this.usersService.update(existingByGoogle.id, {
        lastLoginAt: new Date(),
      });
      return existingByGoogle;
    }

    const existingByEmail = await this.usersService.findOneByEmail(email);
    if (existingByEmail) {
      if (existingByEmail.googleId && existingByEmail.googleId !== googleId) {
        throw new ConflictException('Google account conflict');
      }
      if (!existingByEmail.emailVerifiedAt) {
        throw new ConflictException('Verify email before linking Google');
      }
      if (!payload.email?.toLowerCase().endsWith('@gmail.com') && !payload.hd) {
        throw new ConflictException(
          'Sign in with password before linking Google',
        );
      }
      await this.usersService.update(existingByEmail.id, {
        googleId,
        lastLoginAt: new Date(),
      });
      existingByEmail.googleId = googleId;
      return existingByEmail;
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const company = manager.create(Company, { name: 'Moja firma' });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          companyId: savedCompany.id,
          email,
          password: null,
          googleId,
          firstName: payload.given_name ?? null,
          lastName: payload.family_name ?? null,
          role: UserRole.ADMIN,
          emailVerifiedAt: new Date(),
        });

        return manager.save(newUser);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const concurrentUser =
          await this.usersService.findOneByGoogleId(googleId);
        if (concurrentUser) {
          return concurrentUser;
        }
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashVerificationToken(token);
    const user =
      await this.usersService.findOneByVerificationTokenHash(tokenHash);

    if (
      !user ||
      user.emailVerifiedAt ||
      !user.verificationTokenExpiresAt ||
      user.verificationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.usersService.update(user.id, {
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
  }

  async resendVerification(email: string, origin?: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || user.emailVerifiedAt) {
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
    const user = await this.usersService.findOneByEmail(email);
    // silent no-op for missing email (anti-enumeration); verified + unverified allowed
    if (!user) {
      return;
    }

    const isFirstPassword = user.password == null;
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
        isFirstPassword,
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
