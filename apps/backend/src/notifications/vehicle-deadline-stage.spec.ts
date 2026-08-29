import { selectVehicleDeadlineStage } from './vehicle-deadline-stage';

describe('selectVehicleDeadlineStage', () => {
  it('waits until 08:00 Workspace-local on the threshold date', () => {
    expect(
      selectVehicleDeadlineStage({
        deadlineDate: '2026-10-25',
        leadDays: [30, 14, 7, 0],
        localNow: { date: '2026-10-18', hour: 7, minute: 59, second: 59 },
        activatedLocal: '2026-01-01T08:00:00',
      }),
    ).toBeUndefined();
    expect(
      selectVehicleDeadlineStage({
        deadlineDate: '2026-10-25',
        leadDays: [30, 14, 7, 0],
        localNow: { date: '2026-10-18', hour: 8, minute: 0, second: 0 },
        activatedLocal: '2026-01-01T08:00:00',
      }),
    ).toBe(7);
  });

  it('chooses only the most urgent crossed stage after an outage', () => {
    expect(
      selectVehicleDeadlineStage({
        deadlineDate: '2026-09-30',
        leadDays: [30, 14, 7, 0],
        localNow: { date: '2026-09-25', hour: 12, minute: 0, second: 0 },
        activatedLocal: '2026-01-01T08:00:00',
      }),
    ).toBe(7);
  });

  it('allows due-day catch-up through seven overdue calendar days', () => {
    const input = {
      deadlineDate: '2026-03-29',
      leadDays: [30, 7, 0],
      activatedLocal: '2026-01-01T08:00:00',
    };
    expect(
      selectVehicleDeadlineStage({
        ...input,
        localNow: { date: '2026-04-05', hour: 8, minute: 0, second: 0 },
      }),
    ).toBe(0);
    expect(
      selectVehicleDeadlineStage({
        ...input,
        localNow: { date: '2026-04-06', hour: 8, minute: 0, second: 0 },
      }),
    ).toBeUndefined();
  });

  it('does not create stages whose 08:00 occurrence predates activation', () => {
    expect(
      selectVehicleDeadlineStage({
        deadlineDate: '2026-09-30',
        leadDays: [30, 14, 7, 0],
        localNow: { date: '2026-09-30', hour: 12, minute: 0, second: 0 },
        activatedLocal: '2026-09-24T12:00:00',
      }),
    ).toBe(0);
  });

  it('preserves activation milliseconds at the 08:00 boundary', () => {
    expect(
      selectVehicleDeadlineStage({
        deadlineDate: '2026-09-30',
        leadDays: [0],
        localNow: { date: '2026-09-30', hour: 8, minute: 1, second: 0 },
        activatedLocal: '2026-09-30T08:00:00.500',
      }),
    ).toBeUndefined();
  });
});
