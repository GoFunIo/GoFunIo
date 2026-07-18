import { MembershipRole } from './membership-role';

export interface SessionPrincipal {
  id: string;
  companyId: string;
  role: MembershipRole;
}
