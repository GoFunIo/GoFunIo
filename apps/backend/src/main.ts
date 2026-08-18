import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieSession from 'cookie-session';
import { toMilliseconds } from './common/duration.util';
import { EnvVars, NodeEnv } from './config/env.validation';
import {
  FRONTEND_ORIGINS,
  type FrontendOrigins,
} from './common/frontend-origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<EnvVars, true>>(ConfigService);
  const cookieKey = config.get('COOKIE_KEY');
  const frontendOrigins = app.get<FrontendOrigins>(FRONTEND_ORIGINS);
  const isProd = config.get('NODE_ENV') === NodeEnv.Production;
  const port = config.get('PORT');

  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: [...frontendOrigins.corsOrigins],
    credentials: true,
  });
  app.use(
    cookieSession({
      name: 'session',
      keys: [cookieKey],
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: toMilliseconds({ days: 7 }),
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const docConfig = new DocumentBuilder()
    .setTitle('GoFunIo API')
    .setVersion('1.0')
    .addCookieAuth('session')
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}

bootstrap().catch(console.error);
