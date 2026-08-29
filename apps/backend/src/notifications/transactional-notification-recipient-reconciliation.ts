import type { EntityManager } from 'typeorm';

export const TRANSACTIONAL_NOTIFICATION_RECIPIENT_RECONCILIATION = Symbol(
  'TRANSACTIONAL_NOTIFICATION_RECIPIENT_RECONCILIATION',
);

export interface VehicleDeadlineRecipientReconciliationScope {
  companyId: string;
  vehicleIds?: string[];
  userIds?: string[];
}

export interface TransactionalNotificationRecipientReconciliation {
  reconcileRecipients(
    manager: EntityManager,
    input: VehicleDeadlineRecipientReconciliationScope,
  ): Promise<void>;
}
