import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
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

  private activeUsers(): SelectQueryBuilder<User> {
    return this.usersRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.company', 'company')
      .andWhere('company."deletedAt" IS NULL');
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.activeUsers().andWhere('user.id = :id', { id }).getOne();
  }

  async findActiveByEmail(email: string): Promise<User | null> {
    return this.activeUsers()
      .andWhere('user.email = :email', { email })
      .getOne();
  }

  async findActiveByGoogleId(googleId: string): Promise<User | null> {
    return this.activeUsers()
      .andWhere('user.googleId = :googleId', { googleId })
      .getOne();
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = this.usersRepository.create(user);
    return this.usersRepository.save(entity);
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    password: string,
  ): Promise<number | null> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        password,
        passwordVersion: () => '"passwordVersion" + 1',
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      })
      .where('id = :id', { id })
      .andWhere('password = :currentPassword', { currentPassword })
      .andWhere('"deletedAt" IS NULL')
      .returning('"passwordVersion"')
      .execute();

    return (
      (result.raw as Array<{ passwordVersion: number }>)[0]?.passwordVersion ??
      null
    );
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
