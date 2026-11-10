export const VEHICLE_DEADLINE_SOURCE_VALIDITY_JOINS = `
  JOIN vehicles vehicle
    ON vehicle.id = detail."vehicleId"
   AND vehicle."companyId" = detail."companyId"
   AND vehicle."deletedAt" IS NULL
  JOIN vehicle_deadline_alert_policies policy
    ON policy."companyId" = detail."companyId"
  JOIN vehicle_deadline_dates source_date
    ON source_date."vehicleId" = detail."vehicleId"
   AND source_date."companyId" = detail."companyId"
   AND source_date."deadlineKind" = detail."deadlineKind"`;

export const VEHICLE_DEADLINE_SOURCE_VALIDITY_PREDICATE = `
  notification."invalidatedAt" IS NULL
  AND detail."deadlineKind" = ANY(policy."enabledDeadlineKinds")
  AND source_date."deadlineDate" = detail."deadlineDate"`;
