import type { EntityManager } from 'typeorm';

export const TRANSACTIONAL_VEHICLE_ACCESS = Symbol(
  'TRANSACTIONAL_VEHICLE_ACCESS',
);

export interface TransactionalVehicleAccess {
  authorizedMemberships(
    manager: EntityManager,
    companyId: string,
    vehicleIds: string[],
    userIds?: string[],
  ): Promise<
    Array<{
      membershipId: string;
      userId: string;
      vehicleId: string;
    }>
  >;
  closeManager(
    manager: EntityManager,
    companyId: string,
    managerId: string,
  ): Promise<void>;
}
