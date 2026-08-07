import { Injectable } from '@nestjs/common';
import { EmailRegistrationService } from './email-registration.service';
import type { UserAccount } from './user-account';

@Injectable()
export class AuthService {
  constructor(private emailRegistration: EmailRegistrationService) {}

  async signup(
    email: string,
    password: string,
    origin?: string,
  ): Promise<UserAccount> {
    return this.emailRegistration.register(email, password, origin);
  }
}
