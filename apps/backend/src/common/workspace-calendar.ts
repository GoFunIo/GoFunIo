import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from './clock';

export interface WorkspaceDateTime {
  date: string;
  hour: number;
  minute: number;
  second: number;
}

export function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class WorkspaceCalendar {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  now(timeZone: string): WorkspaceDateTime {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(this.clock.now());
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
    );
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
    };
  }

  isAtOrAfterHour(timeZone: string, hour: number): boolean {
    return this.now(timeZone).hour >= hour;
  }

  daysBetween(fromDate: string, toDate: string): number {
    const from = Date.parse(`${fromDate}T00:00:00.000Z`);
    const to = Date.parse(`${toDate}T00:00:00.000Z`);
    return (to - from) / 86_400_000;
  }
}
