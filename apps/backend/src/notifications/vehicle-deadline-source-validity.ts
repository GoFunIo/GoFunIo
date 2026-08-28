import { VEHICLE_DEADLINE_FIELDS } from './vehicle-deadline-trigger';

const VEHICLE_DEADLINE_DATE_VALIDITY_SQL = Object.entries(
  VEHICLE_DEADLINE_FIELDS,
)
  .map(
    ([kind, field]) =>
      `WHEN '${kind}' THEN vehicle."${field}" = detail."deadlineDate"`,
  )
  .join('\n');

export const VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS = `
  JOIN vehicles vehicle
    ON vehicle.id = detail."vehicleId"
   AND vehicle."companyId" = detail."companyId"
   AND vehicle."deletedAt" IS NULL
  JOIN vehicle_deadline_alert_policies policy
    ON policy."companyId" = detail."companyId"`;

export const VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE = `
  notification."invalidatedAt" IS NULL
  AND detail."deadlineKind" = ANY(policy."enabledDeadlineKinds")
  AND CASE detail."deadlineKind"
    ${VEHICLE_DEADLINE_DATE_VALIDITY_SQL}
  END`;
