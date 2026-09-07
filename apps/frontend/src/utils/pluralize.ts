export const pluralize = (
  count: number | string,
  one: string,
  few: string,
  many: string,
): string => {
  const num = typeof count === 'string' ? parseInt(count, 10) : count;
  if (isNaN(num)) return many;

  const abs = Math.abs(num);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (abs === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};
