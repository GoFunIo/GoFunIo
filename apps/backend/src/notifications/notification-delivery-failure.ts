import { ResendHttpError, ResendResponseError } from '../mail/resend.client';

const FIRST_RETRY_MS = 60_000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_DIAGNOSTIC_LENGTH = 500;

export interface NotificationDeliveryFailure {
  transient: boolean;
  diagnostic: string;
}

export function notificationDeliveryFailure(
  error: unknown,
): NotificationDeliveryFailure {
  if (error instanceof ResendHttpError) {
    return {
      transient:
        error.status === 429 || error.status >= 500 || error.status < 400,
      diagnostic: `provider_http_${error.status}`,
    };
  }
  if (error instanceof ResendResponseError) {
    return { transient: true, diagnostic: 'provider_invalid_response' };
  }
  if (
    error instanceof Error &&
    ['AbortError', 'TimeoutError'].includes(error.name)
  ) {
    return { transient: true, diagnostic: 'provider_timeout' };
  }
  return { transient: true, diagnostic: 'provider_network_error' };
}

export function deliveryRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 30));
  return Math.min(FIRST_RETRY_MS * 2 ** exponent, MAX_RETRY_MS);
}

export function sanitizeDeliveryDiagnostic(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/\{[^{}]*\}/gu, '[provider-response]')
    .replace(/Bearer\s+\S+/giu, 'Bearer [redacted]')
    .replace(/\bre_[A-Za-z0-9_-]+\b/gu, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, '[email]')
    .replace(/\p{Cc}+/gu, ' ')
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}
