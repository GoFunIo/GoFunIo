import { Injectable } from '@nestjs/common';
import { hashPassword, verifyPassword } from './password.util';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string | null): Promise<boolean>;
}

const DUMMY_HASH = `${'0'.repeat(32)}.${'0'.repeat(64)}`;

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  verify(password: string, passwordHash: string | null): Promise<boolean> {
    return verifyPassword(password, passwordHash ?? DUMMY_HASH);
  }
}

export class FakePasswordHasher implements PasswordHasher {
  readonly verifyCalls: Array<{ password: string; hasHash: boolean }> = [];
  private readonly passwords = new Map<string, string>();
  private sequence = 0;

  hash(password: string): Promise<string> {
    const hash = `hash-${++this.sequence}`;
    this.passwords.set(hash, password);
    return Promise.resolve(hash);
  }

  verify(password: string, passwordHash: string | null): Promise<boolean> {
    this.verifyCalls.push({ password, hasHash: passwordHash !== null });
    return Promise.resolve(
      passwordHash !== null && this.passwords.get(passwordHash) === password,
    );
  }
}
