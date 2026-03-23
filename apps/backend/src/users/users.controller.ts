import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';

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

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }
}
