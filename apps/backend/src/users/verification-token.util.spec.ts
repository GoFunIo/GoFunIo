import {
  generateVerificationToken,
  hashVerificationToken,
  VERIFICATION_TOKEN_HEX_LENGTH,
} from './verification-token.util';

describe('verification-token.util', () => {
  describe('hashVerificationToken', () => {
    it('returns deterministic SHA-256 hex for same input', () => {
      const token = 'abc123';
      expect(hashVerificationToken(token)).toBe(hashVerificationToken(token));
      expect(hashVerificationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns different hashes for different inputs', () => {
      expect(hashVerificationToken('token-a')).not.toBe(
        hashVerificationToken('token-b'),
      );
    });
  });

  describe('generateVerificationToken', () => {
    it('returns token with correct length and matching hash', () => {
      const { token, tokenHash, expiresAt } = generateVerificationToken(24);

      expect(token).toHaveLength(VERIFICATION_TOKEN_HEX_LENGTH);
      expect(token).toMatch(/^[a-f0-9]+$/);
      expect(tokenHash).toBe(hashVerificationToken(token));
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('sets expiresAt based on ttlHours', () => {
      const ttlHours = 2;
      const before = Date.now();
      const { expiresAt } = generateVerificationToken(ttlHours);
      const after = Date.now();

      const expectedMin = before + ttlHours * 60 * 60 * 1000;
      const expectedMax = after + ttlHours * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });
});
