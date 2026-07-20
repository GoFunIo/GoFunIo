import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { DataSource, QueryFailedError } from 'typeorm';
import { UsersService } from './users.service';
import { Company } from '../companies/companies.entity';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { hashPassword } from './password.util';
import { EmailVerificationService } from './email-verification.service';
import type { ProvisionedAccount } from './email-verification.store';
import {
  clearExpiredEmailClaims,
  emailClaimInUse,
  lockEmailClaim,
} from './email-claim.util';

const UNIQUE_VIOLATION_CODE = '23505';

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const code = (err.driverError as { code?: string } | undefined)?.code;
  return code === UNIQUE_VIOLATION_CODE;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailVerification: EmailVerificationService,
    private config: ConfigService,
    private dataSource: DataSource,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async signup(
    email: string,
    password: string,
    origin?: string,
  ): Promise<ProvisionedAccount> {
    email = this.normalizeEmail(email);
    return this.emailVerification.register(
      email,
      await hashPassword(password),
      origin,
    );
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

    const { sub: googleId } = payload;
    const email = this.normalizeEmail(payload.email);

    const existingByGoogle =
      await this.usersService.findActiveByGoogleId(googleId);
    if (existingByGoogle) {
      await this.usersService.update(existingByGoogle.id, {
        lastLoginAt: new Date(),
      });
      return existingByGoogle;
    }

    const existingByEmail = await this.usersService.findActiveByEmail(email);
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
        await lockEmailClaim(manager, email);
        await clearExpiredEmailClaims(manager, email);
        const concurrentUser = await manager
          .createQueryBuilder(User, 'user')
          .innerJoinAndSelect('user.company', 'company')
          .where('user.googleId = :googleId', { googleId })
          .andWhere('company."deletedAt" IS NULL')
          .getOne();
        if (concurrentUser) return concurrentUser;
        if (await emailClaimInUse(manager, email)) {
          throw new ConflictException('Email already in use');
        }

        const company = manager.create(Company, { name: 'Moja firma' });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          companyId: savedCompany.id,
          email,
          password: null,
          googleId,
          firstName: payload.given_name ?? null,
          lastName: payload.family_name ?? null,
          role: MembershipRole.ADMIN,
          emailVerifiedAt: new Date(),
        });

        return manager.save(newUser);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const concurrentUser =
          await this.usersService.findActiveByGoogleId(googleId);
        if (concurrentUser) {
          return concurrentUser;
        }
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }
}
