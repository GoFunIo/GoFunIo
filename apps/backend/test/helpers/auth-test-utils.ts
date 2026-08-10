import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from '../../src/users/events/password-reset-requested.event';
import {
  EMAIL_VERIFICATION_REQUESTED_EVENT,
  EmailVerificationRequestedEvent,
} from '../../src/users/events/email-verification-requested.event';
import {
  USER_EMAIL_CHANGE_REQUESTED_EVENT,
  UserEmailChangeRequestedEvent,
} from '../../src/users/events/user-email-change-requested.event';
import {
  MEMBERSHIP_INVITATION_REQUESTED_EVENT,
  MembershipInvitationRequestedEvent,
} from '../../src/users/events/membership-invitation-requested.event';

export interface CapturedEvents {
  verificationToken: string | null;
  passwordResetToken: string | null;
  emailChangeToken: string | null;
  membershipInvitationToken: string | null;
  restore: () => void;
}

export function captureEmittedEvents(app: INestApplication): CapturedEvents {
  const eventEmitter = app.get(EventEmitter2);
  const originalEmit = eventEmitter.emit.bind(eventEmitter);

  let verificationToken: string | null = null;
  let passwordResetToken: string | null = null;
  let emailChangeToken: string | null = null;
  let membershipInvitationToken: string | null = null;

  const emitSpy = jest
    .spyOn(eventEmitter, 'emit')
    .mockImplementation((event, ...args) => {
      if (
        event === EMAIL_VERIFICATION_REQUESTED_EVENT &&
        args[0] instanceof EmailVerificationRequestedEvent
      ) {
        verificationToken = args[0].delivery.token;
      }
      if (
        event === PASSWORD_RESET_REQUESTED_EVENT &&
        args[0] instanceof PasswordResetRequestedEvent
      ) {
        passwordResetToken = args[0].delivery.token;
      }
      if (
        event === USER_EMAIL_CHANGE_REQUESTED_EVENT &&
        args[0] instanceof UserEmailChangeRequestedEvent
      ) {
        emailChangeToken = args[0].delivery.token;
      }
      if (
        event === MEMBERSHIP_INVITATION_REQUESTED_EVENT &&
        args[0] instanceof MembershipInvitationRequestedEvent
      ) {
        membershipInvitationToken = args[0].delivery.token;
      }
      return originalEmit(event, ...args);
    });

  return {
    get verificationToken() {
      return verificationToken;
    },
    get passwordResetToken() {
      return passwordResetToken;
    },
    get emailChangeToken() {
      return emailChangeToken;
    },
    get membershipInvitationToken() {
      return membershipInvitationToken;
    },
    restore() {
      emitSpy.mockRestore();
    },
  };
}

export async function createVerifiedUser(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<{ verificationToken: string }> {
  const events = captureEmittedEvents(app);

  try {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);

    const token = events.verificationToken;
    if (!token) {
      throw new Error('Expected verification token from signup event');
    }

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token })
      .expect(200);

    return { verificationToken: token };
  } finally {
    events.restore();
  }
}

export function buildGoogleVerifyResult(payload: {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}) {
  return {
    getPayload: () => ({
      email_verified: true,
      ...payload,
    }),
  };
}
