import { createHash, randomBytes } from 'crypto';
import { toMilliseconds } from '../common/duration.util';

export const TOKEN_BYTES = 32;
export const TOKEN_HEX_LENGTH = TOKEN_BYTES * 2;

export interface GeneratedToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(ttlHours: number): GeneratedToken {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + toMilliseconds({ hours: ttlHours }));
  return { token, tokenHash, expiresAt };
}
