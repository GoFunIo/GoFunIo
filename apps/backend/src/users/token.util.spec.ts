import { generateToken, hashToken, TOKEN_HEX_LENGTH } from './token.util';

describe('token.util', () => {
  it('hashes tokens as SHA-256 hex', () => {
    expect(hashToken('abc123')).toBe(
      '6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090',
    );
  });

  it('generates a matching token hash and expiry', () => {
    const ttlHours = 2;
    const before = Date.now();
    const { token, tokenHash, expiresAt } = generateToken(ttlHours);
    const after = Date.now();

    expect(token).toHaveLength(TOKEN_HEX_LENGTH);
    expect(token).toMatch(/^[a-f0-9]+$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + ttlHours * 60 * 60 * 1000,
    );
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      after + ttlHours * 60 * 60 * 1000,
    );
  });
});
