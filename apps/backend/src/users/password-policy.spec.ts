import { isNewPassword } from './password-policy';

describe('isNewPassword', () => {
  it.each([
    ['too short', 'Short1!'],
    ['missing uppercase', 'lowercase1!'],
    ['missing lowercase', 'UPPERCASE1!'],
    ['missing number', 'NoNumber!'],
    ['missing special character', 'NoSpecial1'],
    ['non-ASCII', 'ZażółćGęślą1!'],
    ['too long', `${'A'.repeat(126)}a1!`],
    ['not a string', undefined],
  ])('rejects %s', (_reason, password) => {
    expect(isNewPassword(password)).toBe(false);
  });

  it.each(['Aa1!aaaa', `${'A'.repeat(125)}a1!`])(
    'accepts a compliant boundary value',
    (password) => {
      expect(isNewPassword(password)).toBe(true);
    },
  );
});
