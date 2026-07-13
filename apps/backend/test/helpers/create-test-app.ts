import './test-env';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieSession from 'cookie-session';
import { AppModule } from '../../src/app.module';
import { MailService } from '../../src/mail/mail.service';
import { toMilliseconds } from '../../src/common/duration.util';

@Injectable()
class MockThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

const noopMailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(MockThrottlerGuard)
    .overrideProvider(MailService)
    .useValue(noopMailService)
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  app.use(
    cookieSession({
      name: 'session',
      keys: [process.env.COOKIE_KEY!],
      httpOnly: true,
      secure: false,
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

  await app.init();
  return app;
}
