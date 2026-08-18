import { generateToken, hashToken, TOKEN_HEX_LENGTH } from './token.util';

describe('token.util', () => {
  describe('hashToken', () => {
    it('returns deterministic SHA-256 hex for same input', () => {
      const token = 'abc123';
      expect(hashToken(token)).toBe(hashToken(token));
      expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns different hashes for different inputs', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });

  describe('generateToken', () => {
    it('returns token with correct length and matching hash', () => {
      const { token, tokenHash, expiresAt } = generateToken(24);

      expect(token).toHaveLength(TOKEN_HEX_LENGTH);
      expect(token).toMatch(/^[a-f0-9]+$/);
      expect(tokenHash).toBe(hashToken(token));
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('sets expiresAt based on ttlHours', () => {
      const ttlHours = 2;
      const before = Date.now();
      const { expiresAt } = generateToken(ttlHours);
      const after = Date.now();

      const expectedMin = before + ttlHours * 60 * 60 * 1000;
      const expectedMax = after + ttlHours * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });
});
