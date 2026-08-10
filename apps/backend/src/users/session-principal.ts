import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from './membership-role';

export interface SessionPrincipal {
  id: string;
  companyId: string | null;
  role: MembershipRole | null;
}

export function requireCompanyId(principal: SessionPrincipal): string {
  if (!principal.companyId) {
    throw new ForbiddenException('No active workspace');
  }
  return principal.companyId;
}
