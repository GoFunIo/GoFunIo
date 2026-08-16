import type { ArgumentsHost } from '@nestjs/common';
import { ConflictCode } from '../common/conflict';
import { AuthWorkflowExceptionFilter } from './auth-workflow.exception-filter';
import { CredentialPasswordRequiredError } from './credential-authentication.errors';
import {
  EmailChangeEmailInUseError,
  PasswordRequiredForEmailChangeError,
} from './email-change.errors';
import {
  GoogleAccountConflictError,
  GoogleEmailUnverifiedError,
  GoogleExplicitLinkRequiredError,
  GoogleLinkChangedError,
} from './google-authentication.errors';

describe('AuthWorkflowExceptionFilter conflicts', () => {
  it.each([
    {
      exception: new EmailChangeEmailInUseError('email'),
      code: ConflictCode.EMAIL_IN_USE,
      field: 'email',
    },
    {
      exception: new PasswordRequiredForEmailChangeError(),
      code: ConflictCode.SET_PASSWORD_BEFORE_EMAIL_CHANGE,
    },
    {
      exception: new CredentialPasswordRequiredError(),
      code: ConflictCode.USE_PASSWORD_RESET_TO_SET_PASSWORD,
    },
    {
      exception: new GoogleAccountConflictError(),
      code: ConflictCode.GOOGLE_ACCOUNT_CONFLICT,
    },
    {
      exception: new GoogleEmailUnverifiedError(),
      code: ConflictCode.VERIFY_EMAIL_BEFORE_GOOGLE_LINK,
    },
    {
      exception: new GoogleExplicitLinkRequiredError(),
      code: ConflictCode.SIGN_IN_BEFORE_GOOGLE_LINK,
    },
    {
      exception: new GoogleLinkChangedError(),
      code: ConflictCode.GOOGLE_LINK_CHANGED_CONCURRENTLY,
    },
  ])('maps $code', ({ exception, code, field }) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new AuthWorkflowExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: exception.message,
      error: 'Conflict',
      code,
      ...(field ? { field } : {}),
    });
  });
});
