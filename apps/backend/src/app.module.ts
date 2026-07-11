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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    UsersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
