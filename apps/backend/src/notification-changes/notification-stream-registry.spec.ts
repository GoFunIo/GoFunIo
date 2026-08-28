import { EventEmitter } from 'events';
import { NotificationStreamRegistry } from './notification-stream-registry';
import { NotificationSseTransport } from './notification-sse-transport';

describe('NotificationStreamRegistry', () => {
  const workspaceOne = '11111111-1111-4111-8111-111111111111';
  const workspaceTwo = '22222222-2222-4222-8222-222222222222';
  const userOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const userTwo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  it('routes Workspace-wide and User-scoped invalidations without leaking scope', () => {
    const registry = new NotificationStreamRegistry();
    const first = connection();
    const second = connection();
    const otherWorkspace = connection();
    registry.register({ companyId: workspaceOne, userId: userOne }, first);
    registry.register({ companyId: workspaceOne, userId: userTwo }, second);
    registry.register(
      { companyId: workspaceTwo, userId: userOne },
      otherWorkspace,
    );

    registry.invalidate({ companyId: workspaceOne, userId: null });
    expect(first.invalidate).toHaveBeenCalledTimes(1);
    expect(second.invalidate).toHaveBeenCalledTimes(1);
    expect(otherWorkspace.invalidate).not.toHaveBeenCalled();

    registry.invalidate({ companyId: workspaceOne, userId: userOne });
    expect(first.invalidate).toHaveBeenCalledTimes(2);
    expect(second.invalidate).toHaveBeenCalledTimes(1);
    expect(otherWorkspace.invalidate).not.toHaveBeenCalled();
  });

  it('notifies every connection for one User and closes only the targeted scope', () => {
    const registry = new NotificationStreamRegistry();
    const firstTab = connection();
    const secondTab = connection();
    const otherUser = connection();
    registry.register({ companyId: workspaceOne, userId: userOne }, firstTab);
    registry.register({ companyId: workspaceOne, userId: userOne }, secondTab);
    registry.register({ companyId: workspaceOne, userId: userTwo }, otherUser);

    registry.invalidate({ companyId: workspaceOne, userId: userOne });
    registry.close({ companyId: workspaceOne, userId: userOne });

    expect(firstTab.invalidate).toHaveBeenCalledTimes(1);
    expect(secondTab.invalidate).toHaveBeenCalledTimes(1);
    expect(firstTab.close).toHaveBeenCalledTimes(1);
    expect(secondTab.close).toHaveBeenCalledTimes(1);
    expect(otherUser.invalidate).not.toHaveBeenCalled();
    expect(otherUser.close).not.toHaveBeenCalled();
    expect(registry.activeCount()).toBe(1);
  });

  it('closes and forgets every connection on application shutdown', () => {
    const registry = new NotificationStreamRegistry();
    const first = connection();
    const second = connection();
    registry.register({ companyId: workspaceOne, userId: userOne }, first);
    registry.register({ companyId: workspaceTwo, userId: userTwo }, second);

    registry.onApplicationShutdown();

    expect(first.close).toHaveBeenCalledTimes(1);
    expect(second.close).toHaveBeenCalledTimes(1);
    expect(registry.activeCount()).toBe(0);
  });
});

describe('NotificationSseTransport', () => {
  const scope = {
    companyId: '11111111-1111-4111-8111-111111111111',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('writes a server reconnect hint, only content-free changes, and heartbeats around 25 seconds', () => {
    const registry = new NotificationStreamRegistry();
    const transport = new NotificationSseTransport(registry);
    const response = fakeResponse();
    const request = new EventEmitter();

    transport.open(scope, request, response);
    registry.invalidate(scope);
    jest.advanceTimersByTime(25_000);

    expect(response.writes).toEqual([
      'retry: 5000\n\n',
      'event: notification.changed\ndata: {}\n\n',
      ': heartbeat\n\n',
    ]);
  });

  it('cleans timers and references on disconnect and closes at 15 minutes', () => {
    const registry = new NotificationStreamRegistry();
    const transport = new NotificationSseTransport(registry);
    const disconnected = fakeResponse();
    const disconnectedRequest = new EventEmitter();
    transport.open(scope, disconnectedRequest, disconnected);

    disconnectedRequest.emit('close');
    jest.advanceTimersByTime(25_000);
    expect(disconnected.end).toHaveBeenCalledTimes(1);
    expect(disconnected.writes).toEqual(['retry: 5000\n\n']);
    expect(registry.activeCount()).toBe(0);

    const expired = fakeResponse();
    transport.open(scope, new EventEmitter(), expired);
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(expired.end).toHaveBeenCalledTimes(1);
    expect(registry.activeCount()).toBe(0);
  });
});

function connection() {
  return {
    invalidate: jest.fn(),
    close: jest.fn(),
  };
}

function fakeResponse() {
  const writes: string[] = [];
  return {
    writes,
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn((value: string) => {
      writes.push(value);
      return true;
    }),
    end: jest.fn(),
  };
}
