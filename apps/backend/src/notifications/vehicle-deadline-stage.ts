import type { WorkspaceDateTime } from '../common/workspace-calendar';
import { calendarDaysBetween } from '../common/workspace-calendar';

interface VehicleDeadlineStageInput {
  deadlineDate: string;
  leadDays: number[];
  localNow: WorkspaceDateTime;
  activatedLocal: string;
}

export function selectVehicleDeadlineStage(
  input: VehicleDeadlineStageInput,
): number | undefined {
  if (input.localNow.hour < 8) return undefined;
  const daysRemaining = calendarDaysBetween(
    input.localNow.date,
    input.deadlineDate,
  );
  const candidates = [...input.leadDays].sort((a, b) => a - b);
  for (const leadDay of candidates) {
    if (daysRemaining > leadDay) continue;
    if (leadDay === 0 && daysRemaining < -7) return undefined;
    const thresholdDate = addDays(input.deadlineDate, -leadDay);
    if (`${thresholdDate}T08:00:00.000` < input.activatedLocal) continue;
    return leadDay;
  }
  return undefined;
}

export function selectCurrentVehicleDeadlineStage(
  input: Omit<VehicleDeadlineStageInput, 'activatedLocal'>,
): number | undefined {
  const actualDaysRemaining = calendarDaysBetween(
    input.localNow.date,
    input.deadlineDate,
  );
  const localNow =
    input.localNow.hour < 8
      ? {
          date: addDays(input.localNow.date, -1),
          hour: 23,
          minute: 59,
          second: 59,
        }
      : input.localNow;
  const leadDay = selectVehicleDeadlineStage({
    ...input,
    localNow,
    activatedLocal: '0000-01-01T00:00:00.000',
  });
  return leadDay === 0 && actualDaysRemaining < -7 ? undefined : leadDay;
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
