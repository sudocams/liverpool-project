import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { User } from '../models/User.js';

const scrypt = promisify(nodeScrypt);
const temporaryUsers = new Map();

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && password.trim().length > 0;
}

export async function createUser(password, role = 'learner') {
  if (!validatePassword(password)) throw new Error('Use a password between 12 and 128 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const handle = `wolf-${randomBytes(5).toString('hex')}`;
    try {
      if (User.db.readyState === 1) {
        const user = await User.create({ handle, passwordSalt: salt, passwordHash: hash, role });
        return { id: user._id.toString(), handle: user.handle, role: user.role };
      }
      if (temporaryUsers.has(handle)) continue;
      const user = { id: randomBytes(16).toString('hex'), handle, passwordSalt: salt, passwordHash: hash, role };
      temporaryUsers.set(handle, user);
      return { id: user.id, handle, role };
    } catch (error) {
      if (error?.code === 11000) continue;
      throw error;
    }
  }
  throw new Error('Could not allocate a unique sign-in handle. Try again.');
}

export async function authenticateUser(handle, password) {
  if (typeof handle !== 'string' || typeof password !== 'string') return null;
  const user = User.db.readyState === 1
    ? await User.findOne({ handle }).lean()
    : temporaryUsers.get(handle);
  if (!user) {
    await scrypt(password, 'cyberwolf-invalid-user-salt', 64);
    return null;
  }
  const supplied = Buffer.from(await scrypt(password, user.passwordSalt, 64));
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return { id: user._id?.toString() ?? user.id, handle: user.handle, role: user.role };
}

export async function hasAdminAccount() {
  if (User.db.readyState === 1) return (await User.exists({ role: 'admin' })) !== null;
  return [...temporaryUsers.values()].some(user => user.role === 'admin');
}
