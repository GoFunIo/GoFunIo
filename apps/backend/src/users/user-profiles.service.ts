import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserProfileStore } from './user-profile.store';
import type { ProfileChanges, UserProfiles } from './user-profiles';

@Injectable()
export class UserProfilesService implements UserProfiles {
  constructor(private readonly store: UserProfileStore) {}

  get(userId: string) {
    return this.store.get(userId);
  }

  async update(userId: string, changes: ProfileChanges) {
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No profile changes provided');
    }
    const account = await this.store.update(userId, changes);
    if (!account) throw new NotFoundException('User not found');
    return account;
  }
}
