import type { EntityManager } from 'typeorm';

export const TRANSACTIONAL_VEHICLE_ACCESS = Symbol(
  'TRANSACTIONAL_VEHICLE_ACCESS',
);

export interface TransactionalVehicleAccess {
  closeManager(
    manager: EntityManager,
    companyId: string,
    managerId: string,
  ): Promise<void>;
}
