import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async findOneByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ googleId });
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = this.usersRepository.create(user);
    return this.usersRepository.save(entity);
  }

  async findOneByVerificationTokenHash(hash: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.verificationTokenHash',
        'user.verificationTokenExpiresAt',
      ])
      .where('user.verificationTokenHash = :hash', { hash })
      .getOne();
  }

  async consumePasswordResetToken(
    tokenHash: string,
    newPassword: string,
  ): Promise<boolean> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        password: newPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        passwordVersion: () => '"passwordVersion" + 1',
      })
      .where('"passwordResetTokenHash" = :hash', { hash: tokenHash })
      .andWhere('"passwordResetTokenExpiresAt" > :now', { now: new Date() })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async update(id: string, attrs: Partial<User>): Promise<User> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);
  }
}
