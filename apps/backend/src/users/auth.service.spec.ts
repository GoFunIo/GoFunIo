import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { User } from './users.entity';
import { MembershipRole } from './membership-role';
import { EmailRegistrationService } from './email-registration.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    companyId: 'company-1',
    email: 'test@example.com',
    password: 'salt.hash',
    googleId: null,
    firstName: null,
    lastName: null,
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    pendingEmail: null,
    emailChangeTokenHash: null,
    emailChangeTokenExpiresAt: null,
    role: MembershipRole.ADMIN,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    passwordVersion: 1,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    company: {} as User['company'],
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let emailRegistration: jest.Mocked<
    Pick<EmailRegistrationService, 'register'>
  >;

  beforeEach(async () => {
    emailRegistration = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EmailRegistrationService, useValue: emailRegistration },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('delegates email registration', async () => {
      const savedUser = makeUser({
        email: 'new@example.com',
        emailVerifiedAt: null,
      });
      const account = {
        id: savedUser.id,
        email: savedUser.email,
        firstName: null,
        lastName: null,
        phone: null,
        address: null,
        postalCode: null,
        city: null,
        pendingEmail: null,
        hasPassword: true,
      };
      emailRegistration.register.mockResolvedValue(account);

      const result = await service.signup(
        ' New@Example.com ',
        'password123',
        'http://localhost',
      );

      expect(result).toBe(account);
      expect(emailRegistration.register).toHaveBeenCalledWith(
        ' New@Example.com ',
        'password123',
        'http://localhost',
      );
    });
  });
});
