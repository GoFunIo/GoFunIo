import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { validateEnv } from './config/env.validation';
import { buildTypeOrmOptions } from './config/database.config';
import { CompaniesModule } from './companies/companies.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { FrontendOriginsModule } from './common/frontend-origins.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    FrontendOriginsModule,
    UsersModule,
    MailModule,
    CompaniesModule,
    VehiclesModule,
    DriversModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
