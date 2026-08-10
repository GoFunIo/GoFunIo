export enum MembershipRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

export function isWorkspaceAdmin(
  role: MembershipRole | null,
): role is MembershipRole.OWNER | MembershipRole.ADMIN {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
