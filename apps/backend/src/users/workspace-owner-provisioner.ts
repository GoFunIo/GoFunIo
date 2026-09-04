import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Company } from '../companies/companies.entity';
import { assertEmailClaimable } from './email-claim.util';
import { Membership } from './membership.entity';
import { MembershipRole } from './membership-role';
import type { UserAccount } from './user-account';
import { User } from './users.entity';
import { CLOCK, type Clock } from '../common/clock';
import { provisionVehicleDeadlineAlertPolicy } from '../alert-policy/provision-vehicle-deadline-alert-policy';

export const WORKSPACE_OWNER_PROVISIONER = Symbol(
  'WORKSPACE_OWNER_PROVISIONER',
);

interface EmailWorkspaceOwnerProvisioning {
  email: string;
  passwordHash: string;
  verificationTokenHash: string;
  verificationTokenExpiresAt: Date;
}

interface GoogleWorkspaceOwnerProvisioning {
  email: string;
  googleId: string;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: Date;
}

export type WorkspaceOwnerProvisioning =
  | EmailWorkspaceOwnerProvisioning
  | GoogleWorkspaceOwnerProvisioning;

export class WorkspaceOwnerConflictError extends Error {
  constructor() {
    super('Workspace owner identity already in use');
  }
}

export interface WorkspaceOwnerProvisioner {
  provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount>;
}

function isEmailProvisioning(
  input: WorkspaceOwnerProvisioning,
): input is EmailWorkspaceOwnerProvisioning {
  return 'passwordHash' in input;
}

function isUnclaimedAccount(existing: User | null): existing is User {
  return (
    existing?.deletedAt === null &&
    existing.password === null &&
    existing.googleId === null &&
    existing.emailVerifiedAt === null
  );
}

async function findReusableReservation(
  manager: EntityManager,
  input: WorkspaceOwnerProvisioning,
  existing: User | null,
): Promise<User | null> {
  if (!isEmailProvisioning(input) || !isUnclaimedAccount(existing)) {
    return null;
  }
  const hasPendingInvite = await manager.exists(Membership, {
    where: { userId: existing.id, status: 'pending' },
  });
  if (!hasPendingInvite) return null;
  const hasActiveMembership = await manager.exists(Membership, {
    where: { userId: existing.id, status: 'active' },
  });
  return hasActiveMembership ? null : existing;
}

function userPatch(input: WorkspaceOwnerProvisioning) {
  return {
    email: input.email,
    password: isEmailProvisioning(input) ? input.passwordHash : null,
    googleId: isEmailProvisioning(input) ? null : input.googleId,
    firstName: isEmailProvisioning(input) ? null : input.firstName,
    lastName: isEmailProvisioning(input) ? null : input.lastName,
    emailVerifiedAt: isEmailProvisioning(input) ? null : input.emailVerifiedAt,
    verificationTokenHash: isEmailProvisioning(input)
      ? input.verificationTokenHash
      : null,
    verificationTokenExpiresAt: isEmailProvisioning(input)
      ? input.verificationTokenExpiresAt
      : null,
    passwordResetTokenHash: null,
    passwordResetTokenExpiresAt: null,
  };
}

function toUserAccount(
  user: User,
  input: WorkspaceOwnerProvisioning,
): UserAccount {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    address: user.address,
    postalCode: user.postalCode,
    city: user.city,
    pendingEmail: user.pendingEmail,
    hasPassword: isEmailProvisioning(input),
  };
}

function translateWorkspaceOwnerError(error: unknown): unknown {
  if (error instanceof WorkspaceOwnerConflictError) {
    return error;
  }
  if (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string; constraint?: string } | undefined)
      ?.code === '23505' &&
    ['IDX_users_email', 'IDX_users_googleId'].includes(
      (error.driverError as { constraint?: string }).constraint ?? '',
    )
  ) {
    return new WorkspaceOwnerConflictError();
  }
  return error;
}

@Injectable()
export class TypeOrmWorkspaceOwnerProvisioner implements WorkspaceOwnerProvisioner {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount> {
    try {
      return await this.users.manager.transaction(async (manager) => {
        await manager.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          [input.email],
        );
        const existing = await manager
          .createQueryBuilder(User, 'user')
          .withDeleted()
          .addSelect('user.password')
          .where('user.email = :email', { email: input.email })
          .getOne();
        const reservation = await findReusableReservation(
          manager,
          input,
          existing ?? null,
        );
        await assertEmailClaimable(
          manager,
          input.email,
          () => new WorkspaceOwnerConflictError(),
          reservation?.id,
        );
        const company = await manager.save(
          manager.create(Company, { name: 'Moja firma' }),
        );
        await provisionVehicleDeadlineAlertPolicy(
          manager,
          company.id,
          this.clock.now(),
        );
        const user = await manager.save(
          Object.assign(reservation ?? manager.create(User), userPatch(input)),
        );
        await manager.save(
          manager.create(Membership, {
            userId: user.id,
            companyId: company.id,
            role: MembershipRole.OWNER,
          }),
        );
        return toUserAccount(user, input);
      });
    } catch (error) {
      throw translateWorkspaceOwnerError(error);
    }
  }
}

export class FakeWorkspaceOwnerProvisioner implements WorkspaceOwnerProvisioner {
  readonly calls: WorkspaceOwnerProvisioning[] = [];
  error?: Error;

  provision(input: WorkspaceOwnerProvisioning): Promise<UserAccount> {
    this.calls.push(input);
    if (this.error) return Promise.reject(this.error);
    return Promise.resolve({
      id: `user-${this.calls.length}`,
      email: input.email,
      phone: null,
      address: null,
      postalCode: null,
      city: null,
      pendingEmail: null,
      firstName: 'googleId' in input ? input.firstName : null,
      lastName: 'googleId' in input ? input.lastName : null,
      hasPassword: 'passwordHash' in input,
    });
  }
}
