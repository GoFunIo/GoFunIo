import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Session,
  UseInterceptors,
} from '@nestjs/common';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { AuthUserDto } from './dtos/auth-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { AuthService } from './auth.service';
import type { SessionData } from '../types/session.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserInterceptor } from './interceptors/current-user.interceptor';

@Controller('auth')
@Serialize(UserDto)
@UseInterceptors(CurrentUserInterceptor)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authServie: AuthService,
  ) {}

  @Get('users/:id')
  findUser(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOneById(parseInt(id));
  }

  @Get('users')
  findByEmail(@Query('email') email: string): Promise<User[]> {
    return this.usersService.findByEmail(email);
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

  @Post('signup')
  async signup(
    @Body() body: AuthUserDto,
    @Session() session: SessionData,
  ): Promise<User> {
    const user = await this.authServie.signup(body.email, body.password);
    session.userId = user.id;
    return user;
  }

  @Post('signin')
  async signin(
    @Body() body: AuthUserDto,
    @Session() session: SessionData,
  ): Promise<User> {
    const user = await this.authServie.signin(body.email, body.password);
    session.userId = user.id;
    return user;
  }

  @Post('signout')
  signout(@Session() session: SessionData): void {
    session.userId = null;
  }

  @Get('me')
  getMe(@CurrentUser() user: User): User {
    return user;
  }
}
