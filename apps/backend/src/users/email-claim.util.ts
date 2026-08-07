import { EntityManager, QueryFailedError } from 'typeorm';

export function rethrowEmailClaimError(
  error: unknown,
  conflict: () => Error,
): never {
  if (!(error instanceof QueryFailedError)) throw error;
  const driverError = error.driverError as
    | { code?: string; constraint?: string }
    | undefined;
  if (
    driverError?.code === '23505' &&
    (driverError.constraint === 'IDX_users_email' ||
      driverError.constraint === 'IDX_users_pendingEmail')
  ) {
    throw conflict();
  }
  throw error;
}

export async function assertEmailClaimable(
  manager: EntityManager,
  email: string,
  conflict: () => Error,
  excludeUserId?: string,
): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    email,
  ]);
  await manager.query(
    `UPDATE "users"
     SET "pendingEmail" = NULL,
         "emailChangeTokenHash" = NULL,
         "emailChangeTokenExpiresAt" = NULL
     WHERE lower("pendingEmail") = $1
       AND ("emailChangeTokenExpiresAt" IS NULL OR "emailChangeTokenExpiresAt" <= now())`,
    [email],
  );
  const rows = await manager.query<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM "users"
       WHERE (lower("email") = $1 OR lower("pendingEmail") = $1)
         AND ($2::uuid IS NULL OR "id" <> $2)
     ) AS "exists"`,
    [email, excludeUserId ?? null],
  );
  if (rows[0]?.exists) throw conflict();
}
