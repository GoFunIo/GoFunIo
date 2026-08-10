import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipRole } from './membership-role';
import { Membership } from './membership.entity';
import { User } from './users.entity';
import { generateToken, hashToken } from './token.util';
import {
  MEMBERSHIP_INVITATION_REQUESTED_EVENT,
  MembershipInvitationRequestedEvent,
} from './events/membership-invitation-requested.event';

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
        const user = await manager.findOne(User, {
          where: { email },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user || user.deletedAt) {
          throw new NotFoundException('Existing account not found');
        }

        let membership = await manager.findOne(Membership, {
          where: { userId: user.id, companyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (membership?.status === 'active') {
          throw new ConflictException('User is already a workspace member');
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
        return user.email;
      },
    );

    this.events.emit(
      MEMBERSHIP_INVITATION_REQUESTED_EVENT,
      new MembershipInvitationRequestedEvent({
        email: invited,
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
    const result = await this.memberships
      .createQueryBuilder()
      .update(Membership)
      .set({ status: 'active', tokenHash: null, tokenExpiresAt: null })
      .where('"userId" = :userId', { userId })
      .andWhere('"status" = :status', { status: 'pending' })
      .andWhere('"tokenHash" = :tokenHash', { tokenHash: hashToken(token) })
      .andWhere('"tokenExpiresAt" > :now', { now: new Date() })
      .execute();
    if (result.affected !== 1) {
      throw new BadRequestException('Invalid or expired invitation');
    }
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
    const result = await this.memberships.update(
      { id: membershipId, userId, status: 'pending' },
      { status: 'active', tokenHash: null, tokenExpiresAt: null },
    );
    if (result.affected !== 1) {
      throw new NotFoundException('Pending invitation not found');
    }
  }
}
