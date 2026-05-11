import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieSession from 'cookie-session';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile();
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw err;
  }
}

async function bootstrap() {
  const cookieKey = process.env.COOKIE_KEY;
  if (!cookieKey) {
    throw new Error('COOKIE_KEY env var is required');
  }
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule);
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
