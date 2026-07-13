import { EntityManager } from 'typeorm';

export async function lockEmailClaim(
  manager: EntityManager,
  email: string,
): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    email,
  ]);
}

export async function clearExpiredEmailClaims(
  manager: EntityManager,
  email: string,
): Promise<void> {
  await manager.query(
    `UPDATE "users"
     SET "pendingEmail" = NULL,
         "emailChangeTokenHash" = NULL,
         "emailChangeTokenExpiresAt" = NULL
     WHERE lower("pendingEmail") = $1
       AND ("emailChangeTokenExpiresAt" IS NULL OR "emailChangeTokenExpiresAt" <= now())`,
    [email],
  );
}

export async function emailClaimInUse(
  manager: EntityManager,
  email: string,
  excludeUserId?: string,
): Promise<boolean> {
  const rows = await manager.query<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM "users"
       WHERE (lower("email") = $1 OR lower("pendingEmail") = $1)
         AND ($2::uuid IS NULL OR "id" <> $2)
     ) AS "exists"`,
    [email, excludeUserId ?? null],
  );
  return rows[0]?.exists ?? false;
}
