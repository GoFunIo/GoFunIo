import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieSession from 'cookie-session';
import { toMilliseconds } from './common/duration.util';

function resolveCorsOrigins(
  frontendUrl: string,
  corsOrigins?: string,
): string | string[] {
  if (corsOrigins?.trim()) {
    return corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return frontendUrl;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const cookieKey = config.getOrThrow<string>('COOKIE_KEY');
  const frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.enableCors({
    origin: resolveCorsOrigins(frontendUrl, config.get<string>('CORS_ORIGINS')),
    credentials: true,
  });
  app.use(
    cookieSession({
      name: 'session',
      keys: [cookieKey],
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: toMilliseconds({ days: 7 }),
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(port);
}

bootstrap().catch(console.error);
