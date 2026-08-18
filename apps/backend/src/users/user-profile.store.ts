import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UserAccount } from './user-account';
import type { ProfileChanges } from './user-profiles';
import { User } from './users.entity';

@Injectable()
export class UserProfileStore {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async get(userId: string): Promise<UserAccount | null> {
    const user = await this.users.findOneBy({ id: userId });
    return user ? this.account(user) : null;
  }

  async update(
    userId: string,
    changes: ProfileChanges,
  ): Promise<UserAccount | null> {
    const profile: ProfileChanges = {};
    if (changes.firstName !== undefined) profile.firstName = changes.firstName;
    if (changes.lastName !== undefined) profile.lastName = changes.lastName;
    if (changes.phone !== undefined) profile.phone = changes.phone;
    if (changes.address !== undefined) profile.address = changes.address;
    if (changes.postalCode !== undefined)
      profile.postalCode = changes.postalCode;
    if (changes.city !== undefined) profile.city = changes.city;

    const result = await this.users.update(
      { id: userId, deletedAt: IsNull() },
      profile,
    );
    return result.affected ? this.get(userId) : null;
  }

  private account(user: User): UserAccount {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      postalCode: user.postalCode,
      city: user.city,
      pendingEmail: user.pendingEmail,
      hasPassword: user.hasPassword ?? false,
    };
  }
}
