import type { Clock } from './clock';
import { WorkspaceCalendar } from './workspace-calendar';

function fixedClock(instant: string): Clock {
  return { now: () => new Date(instant) };
}

describe('WorkspaceCalendar', () => {
  it('derives the Workspace date across local midnight', () => {
    const calendar = new WorkspaceCalendar(
      fixedClock('2026-03-28T23:30:00.000Z'),
    );

    expect(calendar.now('Europe/Warsaw')).toEqual({
      date: '2026-03-29',
      hour: 0,
      minute: 30,
      second: 0,
    });
  });

  it('opens the daily processing gate at 08:00 Workspace time', () => {
    const before = new WorkspaceCalendar(
      fixedClock('2026-01-15T06:59:59.000Z'),
    );
    const atEight = new WorkspaceCalendar(
      fixedClock('2026-01-15T07:00:00.000Z'),
    );

    expect([
      before.isAtOrAfterHour('Europe/Warsaw', 8),
      atEight.isAtOrAfterHour('Europe/Warsaw', 8),
    ]).toEqual([false, true]);
  });

  it('calculates date-only differences across DST boundaries', () => {
    const calendar = new WorkspaceCalendar(fixedClock('2026-01-01T00:00:00Z'));

    expect([
      calendar.daysBetween('2026-03-28', '2026-03-30'),
      calendar.daysBetween('2026-10-31', '2026-11-02'),
      calendar.daysBetween('2026-11-02', '2026-10-31'),
    ]).toEqual([2, 2, -2]);
  });

  it.each([
    ['Europe/Warsaw', '2026-03-29T00:30:00.000Z', '2026-03-29'],
    ['America/New_York', '2026-11-01T05:30:00.000Z', '2026-11-01'],
  ])('derives dates during the %s DST transition', (zone, instant, date) => {
    const calendar = new WorkspaceCalendar(fixedClock(instant));

    expect(calendar.now(zone).date).toBe(date);
  });
});
