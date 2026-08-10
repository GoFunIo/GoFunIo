import type { UserAccount } from './user-account';

export const USER_PROFILES = Symbol('USER_PROFILES');

export interface ProfileChanges {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

export interface UserProfiles {
  get(userId: string): Promise<UserAccount | null>;
  update(userId: string, changes: ProfileChanges): Promise<UserAccount>;
}
