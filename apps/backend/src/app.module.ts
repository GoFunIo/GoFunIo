import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { EnvVars, validateEnv } from './config/env.validation';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => ({
        ...buildTypeOrmOptions({
          DATABASE_URL: config.get('DATABASE_URL'),
          DATABASE_SCHEMA: config.get('DATABASE_SCHEMA'),
          DATABASE_SSL: config.get('DATABASE_SSL'),
          DATABASE_SSL_REJECT_UNAUTHORIZED: config.get(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          ),
          RUN_MIGRATIONS: config.get('RUN_MIGRATIONS'),
        }),
        autoLoadEntities: true,
      }),
    }),
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
