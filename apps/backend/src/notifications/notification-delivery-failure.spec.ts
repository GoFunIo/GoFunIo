import { ResendHttpError, ResendResponseError } from '../mail/resend.client';
import {
  deliveryRetryDelayMs,
  notificationDeliveryFailure,
  sanitizeDeliveryDiagnostic,
} from './notification-delivery-failure';

describe('notification delivery failures', () => {
  it.each([429, 500, 503])(
    'classifies Resend HTTP %s as transient',
    (status) => {
      expect(notificationDeliveryFailure(new ResendHttpError(status))).toEqual({
        transient: true,
        diagnostic: `provider_http_${status}`,
      });
    },
  );

  it.each([400, 401, 403, 404, 422])(
    'classifies Resend HTTP %s as permanent',
    (status) => {
      expect(notificationDeliveryFailure(new ResendHttpError(status))).toEqual({
        transient: false,
        diagnostic: `provider_http_${status}`,
      });
    },
  );

  it('retries timeouts and uncertain accepted responses', () => {
    expect(
      notificationDeliveryFailure(
        Object.assign(new Error('request timed out'), { name: 'TimeoutError' }),
      ),
    ).toEqual({ transient: true, diagnostic: 'provider_timeout' });
    expect(notificationDeliveryFailure(new ResendResponseError())).toEqual({
      transient: true,
      diagnostic: 'provider_invalid_response',
    });
  });

  it('uses exponential backoff capped at 24 hours', () => {
    expect(deliveryRetryDelayMs(1)).toBe(60_000);
    expect(deliveryRetryDelayMs(2)).toBe(120_000);
    expect(deliveryRetryDelayMs(11)).toBe(61_440_000);
    expect(deliveryRetryDelayMs(12)).toBe(86_400_000);
    expect(deliveryRetryDelayMs(30)).toBe(86_400_000);
  });

  it('bounds and sanitizes addresses, secrets, raw JSON and control characters', () => {
    const diagnostic = sanitizeDeliveryDiagnostic(
      'Bearer secret-token re_abc123 user@example.com\n{"message":"' +
        'x'.repeat(700) +
        '"}',
    );
    expect(diagnostic).not.toContain('secret-token');
    expect(diagnostic).not.toContain('re_abc123');
    expect(diagnostic).not.toContain('user@example.com');
    expect(diagnostic).not.toContain('{');
    expect(diagnostic).not.toContain('\n');
    expect(diagnostic.length).toBeLessThanOrEqual(500);
  });
});
