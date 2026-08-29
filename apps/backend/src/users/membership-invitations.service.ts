import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConflictCode, conflictException } from '../common/conflict';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipRole } from './membership-role';
import { Company } from '../companies/companies.entity';
import {
  TRANSACTIONAL_VEHICLE_ACCESS,
  type TransactionalVehicleAccess,
} from '../fleet/transactional-vehicle-access';
import { Membership } from './membership.entity';
import { User } from './users.entity';
import { generateToken, hashToken } from './token.util';
import {
  MEMBERSHIP_INVITATION_REQUESTED_EVENT,
  MembershipInvitationRequestedEvent,
} from './events/membership-invitation-requested.event';
import { PasswordRecoveryService } from './password-recovery.service';
import {
  TRANSACTIONAL_NOTIFICATION_RECIPIENT_RECONCILIATION,
  type TransactionalNotificationRecipientReconciliation,
} from '../notifications/transactional-notification-recipient-reconciliation';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';

const INVITATION_TTL_HOURS = 7 * 24;

export interface PendingMembershipInvitation {
  id: string;
  companyId: string;
  companyName: string;
  role: MembershipRole;
  status: 'pending';
  expiresAt: Date;
}

@Injectable()
export class MembershipInvitationsService {
  constructor(
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    private readonly events: EventEmitter2,
    private readonly passwordRecovery: PasswordRecoveryService,
    @Inject(TRANSACTIONAL_VEHICLE_ACCESS)
    private readonly vehicleAccess: TransactionalVehicleAccess,
    @Inject(TRANSACTIONAL_NOTIFICATION_RECIPIENT_RECONCILIATION)
    private readonly notificationRecipients: TransactionalNotificationRecipientReconciliation,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {}

  async invite(
    companyId: string,
    email: string,
    role: MembershipRole,
    origin?: string,
  ): Promise<void> {
    const generated = generateToken(INVITATION_TTL_HOURS);
    const invited = await this.memberships.manager.transaction(
      async (manager) => {
        await manager.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          [email],
        );
        let user = await manager
          .createQueryBuilder(User, 'user')
          .withDeleted()
          .addSelect('user.password')
          .where('user.email = :email', { email })
          .setLock('pessimistic_write')
          .getOne();
        if (user?.deletedAt) {
          throw conflictException(
            'Account is unavailable',
            ConflictCode.ACCOUNT_UNAVAILABLE,
          );
        }
        const firstPassword = user
          ? user.password === null &&
            user.googleId === null &&
            user.emailVerifiedAt === null
          : true;
        if (!user) {
          user = await manager.save(
            manager.create(User, {
              email,
              password: null,
              googleId: null,
              emailVerifiedAt: null,
            }),
          );
        }

        let membership = await manager.findOne(Membership, {
          where: { userId: user.id, companyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (membership?.status === 'active') {
          throw conflictException(
            'User is already a workspace member',
            ConflictCode.ALREADY_WORKSPACE_MEMBER,
          );
        }
        membership ??= manager.create(Membership, {
          userId: user.id,
          companyId,
        });
        Object.assign(membership, {
          role,
          status: 'pending',
          tokenHash: generated.tokenHash,
          tokenExpiresAt: generated.expiresAt,
        });
        await manager.save(membership);
        await this.notificationRecipients.reconcileRecipients(manager, {
          companyId,
          userIds: [user.id],
        });
        return {
          membershipId: membership.id,
          userId: user.id,
          email: user.email,
          firstPassword,
        };
      },
    );

    if (invited.firstPassword) {
      await this.passwordRecovery.issueFirstPassword(
        invited.userId,
        origin,
        invited.membershipId,
        INVITATION_TTL_HOURS,
      );
      return;
    }
    this.events.emit(
      MEMBERSHIP_INVITATION_REQUESTED_EVENT,
      new MembershipInvitationRequestedEvent({
        email: invited.email,
        token: generated.token,
        origin,
      }),
    );
  }

  listPending(userId: string): Promise<PendingMembershipInvitation[]> {
    return this.memberships
      .createQueryBuilder('membership')
      .innerJoin('companies', 'company', 'company.id = membership.companyId')
      .select('membership.id', 'id')
      .addSelect('membership.companyId', 'companyId')
      .addSelect('company.name', 'companyName')
      .addSelect('membership.role', 'role')
      .addSelect('membership.status', 'status')
      .addSelect('membership.tokenExpiresAt', 'expiresAt')
      .where('membership.userId = :userId', { userId })
      .andWhere('membership.status = :status', { status: 'pending' })
      .andWhere('company.deletedAt IS NULL')
      .orderBy('membership.createdAt', 'ASC')
      .getRawMany<PendingMembershipInvitation>();
  }

  async acceptToken(userId: string, token: string): Promise<void> {
    const membership = await this.pendingMembership(userId)
      .andWhere('membership.tokenHash = :tokenHash', {
        tokenHash: hashToken(token),
      })
      .andWhere('membership.tokenExpiresAt > :now', { now: new Date() })
      .getOne();
    if (!membership) {
      throw new BadRequestException('Invalid or expired invitation');
    }
    await this.activate(membership, () => {
      throw new BadRequestException('Invalid or expired invitation');
    });
  }

  async decline(userId: string, membershipId: string): Promise<void> {
    const result = await this.memberships.update(
      { id: membershipId, userId, status: 'pending' },
      { status: 'declined', tokenHash: null, tokenExpiresAt: null },
    );
    if (result.affected !== 1) {
      throw new NotFoundException('Pending invitation not found');
    }
  }

  async acceptId(userId: string, membershipId: string): Promise<void> {
    const membership = await this.pendingMembership(userId)
      .andWhere('membership.id = :membershipId', { membershipId })
      .getOne();
    if (!membership) {
      throw new NotFoundException('Pending invitation not found');
    }
    await this.activate(membership, () => {
      throw new NotFoundException('Pending invitation not found');
    });
  }

  private pendingMembership(userId: string) {
    return this.memberships
      .createQueryBuilder('membership')
      .innerJoin(
        Company,
        'company',
        'company.id = membership.companyId AND company."deletedAt" IS NULL',
      )
      .where('membership.userId = :userId', { userId })
      .andWhere('membership.status = :status', { status: 'pending' });
  }

  private async activate(
    membership: Membership,
    fail: () => never,
  ): Promise<void> {
    await this.memberships.manager.transaction(async (manager) => {
      await this.vehicleAccess.closeManager(
        manager,
        membership.companyId,
        membership.userId,
      );
      const result = await manager
        .createQueryBuilder()
        .update(Membership)
        .set({ status: 'active', tokenHash: null, tokenExpiresAt: null })
        .where('id = :id', { id: membership.id })
        .andWhere('status = :status', { status: 'pending' })
        .andWhere(
          `EXISTS (
            SELECT 1 FROM "companies" company
            WHERE company.id = :companyId
              AND company."deletedAt" IS NULL
          )`,
          { companyId: membership.companyId },
        )
        .execute();
      if (result.affected !== 1) fail();
      await this.notificationRecipients.reconcileRecipients(manager, {
        companyId: membership.companyId,
        userIds: [membership.userId],
      });
      await this.notificationChanges.record(manager, {
        companyId: membership.companyId,
        userId: membership.userId,
      });
    });
  }
}
