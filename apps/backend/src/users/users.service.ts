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
    return this.usersRepository.createQueryBuilder('user');
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
