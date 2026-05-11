import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { QueryFailedError } from 'typeorm';

const scrypt = promisify(_scrypt);
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const SQLITE_UNIQUE_CODES = new Set([
  'SQLITE_CONSTRAINT_UNIQUE',
  'SQLITE_CONSTRAINT',
]);

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signup(email: string, password: string) {
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
    const result = salt + '.' + hash.toString('hex');

    try {
      return await this.usersService.create(email, result);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const code = (err.driverError as { code?: string } | undefined)?.code;
        if (code && SQLITE_UNIQUE_CODES.has(code)) {
          throw new BadRequestException('Email already in use');
        }
      }
      throw err;
    }
  }

  async signin(email: string, password: string) {
    const [user] = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, storedHash] = user.password.split('.');
    if (!salt || !storedHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
    const stored = Buffer.from(storedHash, 'hex');

    if (stored.length !== hash.length || !timingSafeEqual(hash, stored)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
