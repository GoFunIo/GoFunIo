export interface DateDiffResult {
  days: number;
  absDays: number;
  isPast: boolean;
  text: string;
}

export const calculateDaysToDate = (dateString: string): DateDiffResult => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isPast = diffDays < 0;
  const absDays = Math.abs(diffDays);

  let text = '';
  if (diffDays === 0) {
    text = 'dzisiaj';
  } else if (isPast) {
    text = absDays === 1 ? '1 dzień temu' : `${absDays} dni temu`;
  } else {
    text = diffDays === 1 ? '1 dzień' : `${diffDays} dni`;
  }

  return {
    days: diffDays,
    absDays,
    isPast,
    text,
  };
};

/**
 * Pomocnicza funkcja sprawdzająca, czy dany ciąg znaków to data w formacie YYYY-MM-DD
 */
export const isDateString = (val: unknown): boolean => {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
};
