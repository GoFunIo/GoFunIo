import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieSession from 'cookie-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const cookieKey = config.getOrThrow<string>('COOKIE_KEY');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.enableCors({ origin: 'http://localhost:5173', credentials: true });
  app.use(
    cookieSession({
      name: 'session',
      keys: [cookieKey],
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(3000);
}

bootstrap().catch(console.error);
