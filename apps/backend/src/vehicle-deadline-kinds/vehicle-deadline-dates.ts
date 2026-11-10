import type { EntityManager } from 'typeorm';

export interface VehicleDeadlineDate {
  deadlineDate: string;
  customLabel: string | null;
}

interface VehicleDeadlineDateRow {
  vehicleId: string;
  deadlineKind: string;
  deadlineDate: string;
  deadlineLabel: string | null;
}

export class VehicleDeadlineDates {
  private readonly dates = new Map<string, VehicleDeadlineDate>();

  constructor(rows: VehicleDeadlineDateRow[]) {
    for (const row of rows) {
      this.dates.set(this.key(row.vehicleId, row.deadlineKind), {
        deadlineDate: row.deadlineDate,
        customLabel: row.deadlineLabel,
      });
    }
  }

  find(vehicleId: string, kind: string): VehicleDeadlineDate | undefined {
    return this.dates.get(this.key(vehicleId, kind));
  }

  private key(vehicleId: string, kind: string): string {
    return `${vehicleId}:${kind}`;
  }
}

export async function loadVehicleDeadlineDates(
  manager: EntityManager,
  vehicleIds: string[],
): Promise<VehicleDeadlineDates> {
  if (!vehicleIds.length) return new VehicleDeadlineDates([]);
  return new VehicleDeadlineDates(
    await manager.query<VehicleDeadlineDateRow[]>(
      `SELECT "vehicleId", "deadlineKind",
              to_char("deadlineDate", 'YYYY-MM-DD') AS "deadlineDate",
              "deadlineLabel"
         FROM vehicle_deadline_dates
        WHERE "vehicleId" = ANY($1::uuid[])`,
      [vehicleIds],
    ),
  );
}
