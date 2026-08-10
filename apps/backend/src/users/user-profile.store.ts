import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const user = await this.users.findOneBy({ id: userId });
    if (!user) return null;

    if (changes.firstName !== undefined) user.firstName = changes.firstName;
    if (changes.lastName !== undefined) user.lastName = changes.lastName;
    if (changes.phone !== undefined) user.phone = changes.phone;
    if (changes.address !== undefined) user.address = changes.address;
    if (changes.postalCode !== undefined) user.postalCode = changes.postalCode;
    if (changes.city !== undefined) user.city = changes.city;

    return this.account(await this.users.save(user));
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
