import { lowercaseEmail, optionalText } from './dto-transforms';

describe('dto transforms', () => {
  it('normalizes email strings and preserves non-strings', () => {
    expect(lowercaseEmail({ value: ' User@Example.COM ' })).toBe(
      'user@example.com',
    );
    expect(lowercaseEmail({ value: null })).toBeNull();
  });

  it('trims optional text, maps blanks to null and preserves missing values', () => {
    expect(optionalText({ value: ' value ' })).toBe('value');
    expect(optionalText({ value: '  ' })).toBeNull();
    expect(optionalText({ value: undefined })).toBeUndefined();
  });
});
