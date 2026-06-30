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

  async findAll(email: string): Promise<User[]> {
    return this.usersRepository.find({ where: { email } });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User[]> {
    return this.usersRepository.findBy({ email });
  }

  async create(
    email: string,
    password: string,
    extra: Partial<
      Pick<
        User,
        | 'verificationTokenHash'
        | 'verificationTokenExpiresAt'
        | 'passwordResetTokenHash'
        | 'passwordResetTokenExpiresAt'
      >
    > = {},
  ): Promise<User> {
    const user = this.usersRepository.create({ email, password, ...extra });
    return this.usersRepository.save(user);
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

  async update(id: number, attrs: Partial<User>): Promise<User> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.remove(user);
  }
}
