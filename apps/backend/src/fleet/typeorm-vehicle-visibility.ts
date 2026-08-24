import { ForbiddenException } from '@nestjs/common';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { isWorkspaceAdmin, MembershipRole } from '../users/membership-role';
import {
  requireCompanyId,
  type SessionPrincipal,
} from '../users/session-principal';

export function constrainToVisibleVehicles<Entity extends ObjectLiteral>(
  query: SelectQueryBuilder<Entity>,
  actor: SessionPrincipal,
): SelectQueryBuilder<Entity> {
  const companyId = requireCompanyId(actor);
  if (!isWorkspaceAdmin(actor.role) && actor.role !== MembershipRole.MANAGER) {
    throw new ForbiddenException();
  }

  query.andWhere('vehicle.companyId = :companyId', { companyId }).andWhere(
    `EXISTS (
        SELECT 1 FROM "memberships" actor_membership
        WHERE actor_membership."userId" = :actorId
          AND actor_membership."companyId" = vehicle."companyId"
          AND actor_membership.role = :actorRole
          AND actor_membership.status = 'active'
      )`,
    { actorId: actor.id, actorRole: actor.role },
  );

  if (actor.role === MembershipRole.MANAGER) {
    query.andWhere(
      `EXISTS (
        SELECT 1 FROM "manager_vehicle_assignments" assignment
        WHERE assignment."vehicleId" = vehicle.id
          AND assignment."companyId" = vehicle."companyId"
          AND assignment."managerId" = :managerId
          AND assignment."assignedTo" IS NULL
      )`,
      { managerId: actor.id },
    );
  }

  return query;
}
