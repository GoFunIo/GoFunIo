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

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
