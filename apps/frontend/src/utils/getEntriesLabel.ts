export const getEntriesLabel = (count: string | number): string => {
  const number = Number(count);

  if (number === 1) return 'wpis';

  const lastDigit = number % 10;
  const lastTwoDigits = number % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return 'wpisy';
  }

  return 'wpisów';
};
