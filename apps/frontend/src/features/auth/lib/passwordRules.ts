export const passwordRules = [
  {
    key: 'minLength',
    text: 'Min. 8 znaków',
    test: (v: string) => v.length >= 8,
  },
  {
    key: 'number',
    text: 'Cyfra',
    test: (v: string) => /\d/.test(v),
  },
  {
    key: 'lowercase',
    text: 'Mała litera',
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    key: 'uppercase',
    text: 'Wielka litera',
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    key: 'special',
    text: 'Znak specjalny',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
  {
    key: 'asciiOnly',
    text: 'Tylko angielskie znaki',
    test: (v: string) => /^[\x00-\x7F]+$/.test(v),
  },
];

export const isPasswordValid = (value: string) => passwordRules.every((r) => r.test(value));

export const getPasswordRulesState = (value: string) =>
  passwordRules.map((r) => ({
    text: r.text,
    valid: r.test(value),
  }));
