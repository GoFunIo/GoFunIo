import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedPassword: string,
): Promise<boolean> {
  const [salt, storedHash] = storedPassword.split('.');
  if (!salt || !storedHash) return false;

  const hash = (await scrypt(password, salt, HASH_BYTES)) as Buffer;
  const stored = Buffer.from(storedHash, 'hex');
  return stored.length === hash.length && timingSafeEqual(hash, stored);
}
