import { createHash, randomBytes } from 'crypto';

export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_TOKEN_HEX_LENGTH = VERIFICATION_TOKEN_BYTES * 2;

export interface GeneratedVerificationToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateVerificationToken(
  ttlHours: number,
): GeneratedVerificationToken {
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}
