import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Company } from '../companies/companies.entity';
import { User } from './users.entity';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AllowedOriginGuard } from '../common/allowed-origin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, AuthService, SessionAuthGuard, AllowedOriginGuard],
})
export class UsersModule {}
