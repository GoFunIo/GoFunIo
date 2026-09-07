export const formatPolishCount = (
  count: number | string,
  singular: string,
  plural: string,
  genitivePlural: string,
): string => {
  const lastTwo = Number(count) % 100;
  const last = Number(count) % 10;

  let word = genitivePlural;

  if (count === 1 || lastTwo === 1) {
    word = singular;
  } else if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
    word = plural;
  }

  return `${count} ${word}`;
};
