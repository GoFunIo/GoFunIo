import type { TokenDelivery } from './token-delivery';

export const MEMBERSHIP_INVITATION_REQUESTED_EVENT =
  'membership-invitation.requested';

export class MembershipInvitationRequestedEvent {
  constructor(public readonly delivery: TokenDelivery) {}
}
