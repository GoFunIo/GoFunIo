export interface DurationInput {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function toMilliseconds(duration: DurationInput): number {
  const {
    milliseconds = 0,
    seconds = 0,
    minutes = 0,
    hours = 0,
    days = 0,
  } = duration;

  const total =
    milliseconds +
    seconds * MS_PER_SECOND +
    minutes * MS_PER_MINUTE +
    hours * MS_PER_HOUR +
    days * MS_PER_DAY;

  if (total <= 0) {
    throw new Error('Duration must be greater than zero');
  }

  return total;
}
