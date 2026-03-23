import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('auth')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users/:id')
  findUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOneById(parseInt(id));
  }

  @Get('users')
  findByEmail(@Query('email') email: string): Promise<User[]> {
    return this.usersService.findByEmail(email);
  }

  @Post('signup')
  signup(@Body() body: CreateUserDto): Promise<User> {
    return this.usersService.create(body.email, body.password);
  }

  @Delete(':id')
  removeUser(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(parseInt(id));
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(parseInt(id), body);
  }
}
