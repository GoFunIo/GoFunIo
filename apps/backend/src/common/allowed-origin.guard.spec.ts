import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AllowedOriginGuard } from './allowed-origin.guard';

function context(origin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ get: () => origin }),
    }),
  } as ExecutionContext;
}

describe('AllowedOriginGuard', () => {
  const origins = { allowsMutation: jest.fn() };
  const guard = new AllowedOriginGuard(origins as never);

  it('delegates the request origin to the shared policy', () => {
    origins.allowsMutation.mockReturnValueOnce(true);
    expect(guard.canActivate(context('https://app.example.com'))).toBe(true);
    expect(origins.allowsMutation).toHaveBeenCalledWith(
      'https://app.example.com',
    );
  });

  it('rejects a denied origin', () => {
    origins.allowsMutation.mockReturnValue(false);
    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
  });
});
