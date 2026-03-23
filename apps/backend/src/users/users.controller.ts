import { Controller, Get, Param } from '@nestjs/common';
import { User } from './users.entity';
import { UsersService } from './users.service';

@Controller('auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users/:id')
  getUser(@Param('id') id: number): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Get('users')
  getUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }
}
