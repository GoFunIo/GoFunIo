import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Membership } from '../users/membership.entity';
import { isWorkspaceAdmin } from '../users/membership-role';
import { VehicleDeadlineAlertPolicy } from './vehicle-deadline-alert-policy.entity';

export async function requireAdminMembership(
  manager: EntityManager,
  companyId: string,
  userId: string,
): Promise<void> {
  const membership = await manager.findOne(Membership, {
    where: { companyId, userId, status: 'active' },
    lock: { mode: 'pessimistic_write' },
  });
  if (!membership || !isWorkspaceAdmin(membership.role)) {
    throw new ForbiddenException();
  }
}

export async function requirePolicyForUpdate(
  manager: EntityManager,
  companyId: string,
): Promise<VehicleDeadlineAlertPolicy> {
  const policy = await manager.findOne(VehicleDeadlineAlertPolicy, {
    where: { companyId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!policy) throw new NotFoundException('Alert policy not found');
  return policy;
}
