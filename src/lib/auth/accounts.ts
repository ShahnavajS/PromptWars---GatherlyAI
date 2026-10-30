import crypto from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { userSessions, users } from '@/lib/db/schema';

const scrypt = promisify(crypto.scrypt);
let dummyHash: Promise<string> | undefined;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[0-9a-f]{32}$/.test(saltHex || '') ||
      !/^[0-9a-f]{128}$/.test(hashHex || '')) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return crypto.timingSafeEqual(actual, expected);
}

export async function registerUser(name: string, email: string, password: string) {
  if (email.toLowerCase() === 'example@gatherly.demo') throw new Error('Reserved account.');
  const user = {
    id: `usr_${crypto.randomUUID()}`,
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  getDb().insert(users).values(user).run();
  return { id: user.id, name: user.name, email: user.email };
}

export async function authenticateUser(email: string, password: string) {
  const user = getDb().select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (!user) {
    dummyHash ??= hashPassword('nonexistent-account-timing-placeholder');
    await verifyPassword(password, await dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, name: user.name, email: user.email };
}

export function exampleAccountConfig() {
  const enabled = process.env.EXAMPLE_ACCOUNT_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.EXAMPLE_ACCOUNT_ENABLED !== 'false');
  return {
    enabled,
    email: 'example@gatherly.demo',
    password: process.env.EXAMPLE_ACCOUNT_PASSWORD || 'Gatherly-Example-2026!',
  };
}

/** Explicitly shared, synthetic account; it never owns the legacy usr_demo event. */
export async function ensureExampleAccount() {
  const config = exampleAccountConfig();
  if (!config.enabled) return;
  const existing = getDb().select().from(users).where(eq(users.id, 'usr_example')).get();
  if (existing) {
    if (existing.email === config.email && await verifyPassword(config.password, existing.passwordHash)) return;
    const passwordHash = await hashPassword(config.password);
    getDb().transaction((tx) => {
      tx.delete(userSessions).where(eq(userSessions.userId, existing.id)).run();
      tx.update(users).set({ email: config.email, passwordHash }).where(eq(users.id, existing.id)).run();
    });
    return;
  }
  try {
    getDb().insert(users).values({
      id: 'usr_example',
      email: config.email,
      name: 'Example Organizer',
      passwordHash: await hashPassword(config.password),
      createdAt: new Date().toISOString(),
    }).run();
  } catch {
    // A concurrent first login may have created it.
  }
}
