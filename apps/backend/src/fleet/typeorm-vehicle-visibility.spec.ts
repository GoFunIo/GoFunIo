import { ForbiddenException } from '@nestjs/common';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { MembershipRole } from '../users/membership-role';
import type { SessionPrincipal } from '../users/session-principal';
import { constrainToVisibleVehicles } from './typeorm-vehicle-visibility';

describe('constrainToVisibleVehicles', () => {
  it('applies workspace and active membership visibility for admins', () => {
    const query = queryBuilder();

    expect(
      constrainToVisibleVehicles(
        query.builder,
        principal(MembershipRole.ADMIN),
      ),
    ).toBe(query.builder);

    expect(query.andWhere).toHaveBeenCalledTimes(2);
    expect(query.andWhere).toHaveBeenNthCalledWith(
      1,
      'vehicle.companyId = :companyId',
      { companyId: 'company-one' },
    );
    expect(query.andWhere).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('actor_membership.status'),
      { actorId: 'user-one', actorRole: MembershipRole.ADMIN },
    );
  });

  it('also requires an active Vehicle Access for managers', () => {
    const query = queryBuilder();

    constrainToVisibleVehicles(
      query.builder,
      principal(MembershipRole.MANAGER),
    );

    expect(query.andWhere).toHaveBeenCalledTimes(3);
    expect(query.andWhere).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('manager_vehicle_assignments'),
      { managerId: 'user-one' },
    );
  });

  it.each([
    principal(null),
    { ...principal(MembershipRole.ADMIN), companyId: null },
  ])('rejects principals outside a supported Active Workspace', (actor) => {
    expect(() =>
      constrainToVisibleVehicles(queryBuilder().builder, actor),
    ).toThrow(ForbiddenException);
  });
});

function queryBuilder() {
  const andWhere = jest.fn().mockReturnThis();
  return {
    andWhere,
    builder: { andWhere } as unknown as SelectQueryBuilder<ObjectLiteral>,
  };
}

function principal(role: MembershipRole | null): SessionPrincipal {
  return { id: 'user-one', companyId: 'company-one', role };
}
