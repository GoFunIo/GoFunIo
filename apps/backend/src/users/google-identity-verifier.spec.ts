import { ConfigService } from '@nestjs/config';
import { InvalidGoogleIdentityError } from './google-authentication.errors';
import { GoogleSdkIdentityVerifier } from './google-identity-verifier';

const verifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

describe('GoogleSdkIdentityVerifier', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('client-id'),
  } as unknown as ConfigService;

  beforeEach(() => jest.clearAllMocks());

  it('returns a neutral verified identity', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-1',
        email: ' User@Example.com ',
        email_verified: true,
        given_name: 'Jan',
        family_name: 'Kowalski',
        hd: 'example.com',
      }),
    });

    await expect(
      new GoogleSdkIdentityVerifier(config).verify('token'),
    ).resolves.toEqual({
      googleId: 'google-1',
      email: 'user@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      hostedDomain: 'example.com',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: 'client-id',
    });
  });

  it('rejects SDK errors and incomplete claims', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-1' }),
    });
    await expect(
      new GoogleSdkIdentityVerifier(config).verify('token'),
    ).rejects.toBeInstanceOf(InvalidGoogleIdentityError);

    verifyIdToken.mockRejectedValue(new Error('SDK error'));
    await expect(
      new GoogleSdkIdentityVerifier(config).verify('token'),
    ).rejects.toBeInstanceOf(InvalidGoogleIdentityError);
  });
});
