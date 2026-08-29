import type { INestApplication } from '@nestjs/common';
import {
  request as httpRequest,
  type ClientRequest,
  type IncomingMessage,
} from 'http';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import {
  captureEmittedEvents,
  createVerifiedUser,
} from './helpers/auth-test-utils';
import { NotificationChangeRelay } from '../src/notification-changes/notification-change-relay';
import { MembershipRole } from '../src/users/membership-role';

describe('Notification SSE (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let relay: NotificationChangeRelay;
  let port: number;

  beforeAll(async () => {
    app = (await createTestApp()) as INestApplication<App>;
    await app.listen(0);
    dataSource = app.get(DataSource);
    relay = app.get(NotificationChangeRelay);
    port = (
      app.getHttpServer() as unknown as {
        address(): { port: number };
      }
    ).address().port;
  });

  afterAll(async () => app.close());

  it('requires a cookie session and rejects token or Workspace authority in the query', async () => {
    await request(app.getHttpServer()).get('/notifications/stream').expect(401);
    const actor = await signedIn('stream-authority@example.com');

    await request(app.getHttpServer())
      .get(
        '/notifications/stream?companyId=11111111-1111-4111-8111-111111111111',
      )
      .set('Cookie', actor.cookie)
      .expect(400);
    await request(app.getHttpServer())
      .get('/notifications/stream?token=not-authority')
      .set('Cookie', actor.cookie)
      .expect(400);
  });

  it('opens for the Active Workspace and invalidates even when live toasts are disabled', async () => {
    const actor = await signedIn('stream-preference@example.com');
    const stream = await openStream(actor.cookie);
    await stream.waitFor('retry: 5000\n\n');

    await request(app.getHttpServer())
      .patch('/notification-preferences/me')
      .set('Cookie', actor.cookie)
      .send({
        preferences: [{ category: 'FLEET_DEADLINES', showLiveToasts: false }],
      })
      .expect(200);

    await stream.waitFor('event: notification.changed\ndata: {}\n\n');
    expect(stream.text()).not.toContain(actor.userId);
    expect(stream.text()).not.toContain(actor.companyId);
    stream.close();
    await stream.waitForEnd();
  });

  it('isolates User and Workspace scopes and closes after Membership access loss', async () => {
    const first = await signedIn('stream-first@example.com');
    const second = await signedIn('stream-second@example.com');
    const firstStream = await openStream(first.cookie);
    const secondStream = await openStream(second.cookie);
    await Promise.all([
      firstStream.waitFor('retry: 5000\n\n'),
      secondStream.waitFor('retry: 5000\n\n'),
    ]);

    await dataSource.transaction((manager) =>
      relay.record(manager, {
        companyId: first.companyId,
        userId: first.userId,
      }),
    );
    await firstStream.waitFor('event: notification.changed');
    await expect(
      secondStream.doesNotReceive('event: notification.changed'),
    ).resolves.toBe(true);

    await dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE memberships SET status = 'removed'
          WHERE "companyId" = $1 AND "userId" = $2`,
        [first.companyId, first.userId],
      );
      await relay.record(manager, {
        companyId: first.companyId,
        userId: first.userId,
      });
    });
    await firstStream.waitForEnd();
    expect(secondStream.isEnded()).toBe(false);
    secondStream.close();
    await secondStream.waitForEnd();
  });

  it('routes Workspace-wide and User-scoped changes across two Users and two Workspace sessions', async () => {
    const owner = await signedIn('stream-shared-owner@example.com');
    const dualMember = await signedIn('stream-dual-member@example.com');
    const invitation = captureEmittedEvents(app);
    try {
      await request(app.getHttpServer())
        .post('/users/invitations')
        .set('Cookie', owner.cookie)
        .send({
          email: 'stream-dual-member@example.com',
          role: MembershipRole.MANAGER,
        })
        .expect(201);
      if (!invitation.membershipInvitationToken) {
        throw new Error('Expected Membership invitation token');
      }
      await request(app.getHttpServer())
        .post('/auth/invitations/accept')
        .set('Cookie', dualMember.cookie)
        .send({ token: invitation.membershipInvitationToken })
        .expect(204);
    } finally {
      invitation.restore();
    }

    const secondSession = await session('stream-dual-member@example.com');
    const sharedWorkspaceCookie = await switchWorkspace(
      secondSession.cookie,
      owner.companyId,
    );
    const ownerStream = await openStream(owner.cookie);
    const sharedWorkspaceStream = await openStream(sharedWorkspaceCookie);
    const ownWorkspaceStream = await openStream(dualMember.cookie);
    await Promise.all(
      [ownerStream, sharedWorkspaceStream, ownWorkspaceStream].map((stream) =>
        stream.waitFor('retry: 5000\n\n'),
      ),
    );

    await dataSource.transaction((manager) =>
      relay.record(manager, {
        companyId: owner.companyId,
        userId: owner.userId,
      }),
    );
    await ownerStream.waitForEventCount(1);
    await expect(
      sharedWorkspaceStream.doesNotReceive('event: notification.changed'),
    ).resolves.toBe(true);
    await expect(
      ownWorkspaceStream.doesNotReceive('event: notification.changed'),
    ).resolves.toBe(true);

    await dataSource.transaction((manager) =>
      relay.record(manager, { companyId: owner.companyId, userId: null }),
    );
    await Promise.all([
      ownerStream.waitForEventCount(2),
      sharedWorkspaceStream.waitForEventCount(1),
    ]);
    expect(ownWorkspaceStream.eventCount()).toBe(0);

    await dataSource.transaction((manager) =>
      relay.record(manager, {
        companyId: dualMember.companyId,
        userId: dualMember.userId,
      }),
    );
    await ownWorkspaceStream.waitForEventCount(1);
    expect(sharedWorkspaceStream.eventCount()).toBe(1);

    ownerStream.close();
    sharedWorkspaceStream.close();
    ownWorkspaceStream.close();
    await Promise.all([
      ownerStream.waitForEnd(),
      sharedWorkspaceStream.waitForEnd(),
      ownWorkspaceStream.waitForEnd(),
    ]);
  });

  it('rejects a session whose Active Workspace Membership is no longer active', async () => {
    const actor = await signedIn('stream-removed@example.com');
    await dataSource.query(
      `UPDATE memberships SET status = 'removed'
        WHERE "companyId" = $1 AND "userId" = $2`,
      [actor.companyId, actor.userId],
    );
    await request(app.getHttpServer())
      .get('/notifications/stream')
      .set('Cookie', actor.cookie)
      .expect(403);
  });

  async function signedIn(email: string) {
    const password = 'Password123!';
    await createVerifiedUser(app, email, password);
    return session(email, password);
  }

  async function session(email: string, password = 'Password123!') {
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(201);
    const setCookies = response.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    if (!setCookies?.length) throw new Error('Expected session cookie');
    const cookie = setCookies.map((value) => value.split(';', 1)[0]).join('; ');
    const [{ userId, companyId }] = await dataSource.query<
      Array<{ userId: string; companyId: string }>
    >(
      `SELECT membership."userId", membership."companyId"
         FROM memberships membership
         JOIN users "user" ON "user".id = membership."userId"
        WHERE "user".email = $1 AND membership.status = 'active'`,
      [email],
    );
    return { cookie, userId, companyId };
  }

  async function switchWorkspace(
    cookie: string,
    companyId: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/switch-company')
      .set('Cookie', cookie)
      .send({ companyId })
      .expect(204);
    const changed = response.headers['set-cookie'] as unknown as
      | string[]
      | undefined;
    if (!changed?.length) throw new Error('Expected updated session cookie');
    return changed.map((value) => value.split(';', 1)[0]).join('; ');
  }

  function openStream(cookie: string): Promise<TestStream> {
    return new Promise((resolve, reject) => {
      const client = httpRequest(
        { port, path: '/notifications/stream', headers: { Cookie: cookie } },
        (response) => resolve(new TestStream(client, response)),
      );
      client.once('error', reject);
      client.end();
    });
  }
});

class TestStream {
  private chunks = '';
  private ended = false;

  constructor(
    private readonly request: ClientRequest,
    private readonly response: IncomingMessage,
  ) {
    response.setEncoding('utf8');
    response.on('data', (chunk: string) => (this.chunks += chunk));
    response.on('end', () => (this.ended = true));
    response.on('close', () => (this.ended = true));
  }

  text(): string {
    return this.chunks;
  }

  isEnded(): boolean {
    return this.ended;
  }

  async waitFor(value: string): Promise<void> {
    await waitUntil(() => this.chunks.includes(value));
  }

  async doesNotReceive(value: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 75));
    return !this.chunks.includes(value);
  }

  eventCount(): number {
    return this.chunks.split('event: notification.changed').length - 1;
  }

  async waitForEventCount(count: number): Promise<void> {
    await waitUntil(() => this.eventCount() >= count);
  }

  close(): void {
    this.request.destroy();
    this.response.destroy();
  }

  async waitForEnd(): Promise<void> {
    await waitUntil(() => this.ended);
  }
}

async function waitUntil(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for SSE');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
