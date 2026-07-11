import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PASSWORD_RESET_REQUESTED_EVENT,
  PasswordResetRequestedEvent,
} from '../../src/users/events/password-reset-requested.event';
import {
  USER_REGISTERED_EVENT,
  UserRegisteredEvent,
} from '../../src/users/events/user-registered.event';

export interface CapturedEvents {
  verificationToken: string | null;
  passwordResetToken: string | null;
  restore: () => void;
}

export function captureEmittedEvents(app: INestApplication): CapturedEvents {
  const eventEmitter = app.get(EventEmitter2);
  const originalEmit = eventEmitter.emit.bind(eventEmitter);

  let verificationToken: string | null = null;
  let passwordResetToken: string | null = null;

  const emitSpy = jest
    .spyOn(eventEmitter, 'emit')
    .mockImplementation((event, ...args) => {
      if (
        event === USER_REGISTERED_EVENT &&
        args[0] instanceof UserRegisteredEvent
      ) {
        verificationToken = args[0].token;
      }
      if (
        event === PASSWORD_RESET_REQUESTED_EVENT &&
        args[0] instanceof PasswordResetRequestedEvent
      ) {
        passwordResetToken = args[0].token;
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

export function buildGoogleVerifyResult(
  payload: {
    sub: string;
    email: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
  },
) {
  return {
    getPayload: () => ({
      email_verified: true,
      ...payload,
    }),
  };
}
