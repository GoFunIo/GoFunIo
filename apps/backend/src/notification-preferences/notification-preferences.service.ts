import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../users/membership.entity';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';
import { NotificationPreferencesDto } from './dtos/notification-preferences.dto';
import { UpdateNotificationPreferencesDto } from './dtos/update-notification-preferences.dto';
import {
  DEFAULT_NOTIFICATION_EMAIL_MODE,
  DEFAULT_SHOW_LIVE_TOASTS,
  NOTIFICATION_CATEGORIES,
  NotificationPreference,
} from './notification-preference.entity';
import { NotificationChangeRelay } from '../notification-changes/notification-change-relay';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferences: Repository<NotificationPreference>,
    private readonly notificationChanges: NotificationChangeRelay,
  ) {}

  async get(actor: SessionPrincipal): Promise<NotificationPreferencesDto> {
    const companyId = requireCompanyId(actor);
    const membership = await this.preferences.manager.findOneBy(Membership, {
      companyId,
      userId: actor.id,
      status: 'active',
    });
    if (!membership) throw new ForbiddenException();
    const stored = await this.preferences.findBy({
      companyId,
      membershipId: membership.id,
    });
    return this.effective(stored);
  }

  update(
    actor: SessionPrincipal,
    body: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    const companyId = requireCompanyId(actor);
    return this.preferences.manager.transaction(async (manager) => {
      const membership = await manager.findOne(Membership, {
        where: { companyId, userId: actor.id, status: 'active' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!membership) throw new ForbiddenException();

      for (const change of body.preferences) {
        const hasEmailMode = change.emailMode !== undefined;
        const hasShowLiveToasts = change.showLiveToasts !== undefined;
        await manager.query(
          `INSERT INTO "notification_preferences" AS preference
            ("companyId", "membershipId", "category", "emailMode", "showLiveToasts")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT ON CONSTRAINT "PK_notification_preferences"
           DO UPDATE SET
             "emailMode" = CASE
               WHEN $6::boolean THEN EXCLUDED."emailMode"
               ELSE preference."emailMode"
             END,
             "showLiveToasts" = CASE
               WHEN $7::boolean THEN EXCLUDED."showLiveToasts"
               ELSE preference."showLiveToasts"
             END,
             "updatedAt" = CURRENT_TIMESTAMP`,
          [
            companyId,
            membership.id,
            change.category,
            change.emailMode ?? DEFAULT_NOTIFICATION_EMAIL_MODE,
            change.showLiveToasts ?? DEFAULT_SHOW_LIVE_TOASTS,
            hasEmailMode,
            hasShowLiveToasts,
          ],
        );
      }

      const stored = await manager.findBy(NotificationPreference, {
        companyId,
        membershipId: membership.id,
      });
      await this.notificationChanges.record(manager, {
        companyId,
        userId: actor.id,
      });
      return this.effective(stored);
    });
  }

  private effective(
    stored: NotificationPreference[],
  ): NotificationPreferencesDto {
    const byCategory = new Map(stored.map((item) => [item.category, item]));
    return {
      preferences: NOTIFICATION_CATEGORIES.map((category) => {
        const preference = byCategory.get(category);
        return {
          category,
          emailMode: preference?.emailMode ?? DEFAULT_NOTIFICATION_EMAIL_MODE,
          showLiveToasts:
            preference?.showLiveToasts ?? DEFAULT_SHOW_LIVE_TOASTS,
        };
      }),
    };
  }
}
