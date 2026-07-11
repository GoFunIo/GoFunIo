import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowedOriginGuard } from './allowed-origin.guard';

function context(origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ get: () => origin }),
    }),
  } as ExecutionContext;
}

describe('AllowedOriginGuard', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    ),
    getOrThrow: jest.fn(() => 'https://app.example.com'),
  } as unknown as ConfigService;
  const guard = new AllowedOriginGuard(config);

  it('allows configured origin', () => {
    expect(guard.canActivate(context('https://app.example.com'))).toBe(true);
  });

  it('rejects missing or foreign origin', () => {
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context('https://evil.example'))).toThrow(
      ForbiddenException,
    );
  });
});
