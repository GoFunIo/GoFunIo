import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { UserProfileStore } from './user-profile.store';
import { UserProfilesService } from './user-profiles.service';

describe('UserProfiles', () => {
  const account = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: null,
    lastName: null,
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    pendingEmail: null,
    hasPassword: true,
  };
  let store: jest.Mocked<Pick<UserProfileStore, 'get' | 'update'>>;
  let profiles: UserProfilesService;

  beforeEach(() => {
    store = { get: jest.fn(), update: jest.fn() };
    profiles = new UserProfilesService(store as unknown as UserProfileStore);
  });

  it('returns the safe account projection', async () => {
    store.get.mockResolvedValue(account);

    await expect(profiles.get(account.id)).resolves.toBe(account);
  });

  it('rejects an empty update', async () => {
    await expect(profiles.update(account.id, {})).rejects.toEqual(
      new BadRequestException('No profile changes provided'),
    );
    expect(store.update).not.toHaveBeenCalled();
  });

  it('updates nullable profile fields and rejects a missing account', async () => {
    store.update.mockResolvedValueOnce({ ...account, city: null });
    await expect(profiles.update(account.id, { city: null })).resolves.toEqual({
      ...account,
      city: null,
    });

    store.update.mockResolvedValueOnce(null);
    await expect(
      profiles.update('missing', { firstName: 'Jan' }),
    ).rejects.toEqual(new NotFoundException('User not found'));
  });
});
