import { BadRequestException, ConflictException } from '@nestjs/common';
import { MembershipRole } from '../users/membership-role';
import { FakeFleetUnitOfWork } from './fleet-unit-of-work';

describe('Driver membership link', () => {
  const companyId = 'company-one';
  const input = {
    companyId,
    firstName: 'Linked',
    lastName: 'Driver',
    email: null,
    phone: null,
    notes: null,
  };

  it('links one driver per membership and frees the link on soft delete', async () => {
    const fleet = setup();

    const driver = await fleet.transact(({ drivers }) =>
      drivers.create({ ...input, userId: 'user-one' }),
    );
    expect(driver.userId).toBe('user-one');

    await expect(
      fleet.transact(({ drivers }) =>
        drivers.create({ ...input, userId: 'user-one' }),
      ),
    ).rejects.toThrow(new ConflictException('Membership already linked'));

    await fleet.transact(({ drivers }) => drivers.softDelete(driver.id));
    const replacement = await fleet.transact(({ drivers }) =>
      drivers.create({ ...input, userId: 'user-one' }),
    );
    expect(replacement.id).not.toBe(driver.id);
  });

  it('rejects memberships from another workspace or missing entirely', async () => {
    const fleet = setup();

    await expect(
      fleet.transact(({ drivers }) =>
        drivers.create({ ...input, userId: 'user-other' }),
      ),
    ).rejects.toThrow(new BadRequestException('Invalid membership'));
    await expect(
      fleet.transact(({ drivers }) =>
        drivers.create({ ...input, userId: 'user-missing' }),
      ),
    ).rejects.toThrow(new BadRequestException('Invalid membership'));
  });

  it('updates and clears the link with the same rules', async () => {
    const fleet = setup();
    const first = await fleet.transact(({ drivers }) =>
      drivers.create({ ...input, userId: null }),
    );
    const second = await fleet.transact(({ drivers }) =>
      drivers.create({ ...input, userId: 'user-one' }),
    );

    await expect(
      fleet.transact(({ drivers }) =>
        drivers.update(first.id, { userId: 'user-one' }),
      ),
    ).rejects.toThrow(new ConflictException('Membership already linked'));
    await expect(
      fleet.transact(({ drivers }) =>
        drivers.update(first.id, { userId: 'user-other' }),
      ),
    ).rejects.toThrow(new BadRequestException('Invalid membership'));

    const relinked = await fleet.transact(({ drivers }) =>
      drivers.update(second.id, { userId: 'user-two' }),
    );
    expect(relinked.userId).toBe('user-two');
    const cleared = await fleet.transact(({ drivers }) =>
      drivers.update(second.id, { userId: null }),
    );
    expect(cleared.userId).toBeNull();
  });

  function setup() {
    const fleet = new FakeFleetUnitOfWork();
    fleet.memberships.push(membership('user-one'), membership('user-two'), {
      userId: 'user-other',
      companyId: 'company-two',
      role: MembershipRole.MANAGER,
      status: 'active',
    });
    return fleet;
  }

  function membership(userId: string) {
    return {
      userId,
      companyId,
      role: MembershipRole.MANAGER,
      status: 'active',
    };
  }
});
