import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { User } from '../models/User.js';

const scrypt = promisify(nodeScrypt);
const temporaryUsers = new Map();

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && password.trim().length > 0;
}

export function validateAdminUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9._-]{3,32}$/.test(username.trim());
}

export async function createUser(password, role = 'learner', username = null) {
  if (!validatePassword(password)) throw new Error('Use a password between 12 and 128 characters.');
  if (role === 'admin' && !validateAdminUsername(username)) throw new Error('Admin username must be 3–32 letters, numbers, dots, underscores, or hyphens.');
  const normalizedUsername = role === 'admin' ? username.trim().toLowerCase() : null;
  if (role === 'admin') {
    const duplicate = User.db.readyState === 1
      ? await User.exists({ username: normalizedUsername })
      : [...temporaryUsers.values()].some(item => item.username === normalizedUsername);
    if (duplicate) throw new Error('An account already uses that admin username.');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const handle = `wolf-${randomBytes(5).toString('hex')}`;
    try {
      if (User.db.readyState === 1) {
        const user = await User.create({ handle, ...(normalizedUsername ? { username: normalizedUsername } : {}), passwordSalt: salt, passwordHash: hash, credentialsConfigured: role === 'learner', role });
        return { id: user._id.toString(), handle: user.handle, username: user.username, role: user.role, credentialsConfigured: role === 'learner', researchConsent: user.researchConsent };
      }
      if (temporaryUsers.has(handle)) continue;
      if (role === 'admin' && [...temporaryUsers.values()].some(item => item.username === normalizedUsername)) throw new Error('An account already uses that admin username.');
      const user = { id: randomBytes(16).toString('hex'), handle, username: normalizedUsername, passwordSalt: salt, passwordHash: hash, credentialsConfigured: role === 'learner', role, researchConsent: { version: null, acceptedAt: null } };
      temporaryUsers.set(handle, user);
      return { id: user.id, handle, username: user.username, role, credentialsConfigured: user.credentialsConfigured };
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.username) throw new Error('An account already uses that admin username.');
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
  return { id: user._id?.toString() ?? user.id, handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, researchConsent: user.researchConsent };
}

export async function authenticateAdmin(username, password) {
  if (!validateAdminUsername(username) || typeof password !== 'string') return null;
  const normalizedUsername = username.trim().toLowerCase();
  let user = User.db.readyState === 1
    ? await User.findOne({ role: 'admin', $or: [{ username: normalizedUsername }, { handle: username.trim() }] }).lean()
    : [...temporaryUsers.values()].find(item => item.role === 'admin' && (item.username === normalizedUsername || item.handle === username.trim()));
  let legacyAdmin = false;
  if (!user) {
    const unconfiguredAdmins = User.db.readyState === 1
      ? await User.find({ role: 'admin', username: { $exists: false } }).limit(2).lean()
      : [...temporaryUsers.values()].filter(item => item.role === 'admin' && !item.username);
    if (unconfiguredAdmins.length === 1) {
      [user] = unconfiguredAdmins;
      legacyAdmin = true;
    }
  }
  if (!user) {
    await scrypt(password, 'cyberwolf-invalid-user-salt', 64);
    return null;
  }
  const supplied = Buffer.from(await scrypt(password, user.passwordSalt, 64));
  const expected = Buffer.from(user.passwordHash, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  if (legacyAdmin) {
    const duplicate = User.db.readyState === 1
      ? await User.exists({ username: normalizedUsername })
      : [...temporaryUsers.values()].some(item => item.username === normalizedUsername);
    if (duplicate) return null;
    if (User.db.readyState === 1) user = await User.findByIdAndUpdate(user._id, { $set: { username: normalizedUsername } }, { new: true }).lean();
    else user.username = normalizedUsername;
  }
  return { id: user._id?.toString() ?? user.id, handle: user.handle, username: user.username ?? user.handle, role: user.role, researchConsent: user.researchConsent };
}

export async function setLearnerPassword(accountId, password) {
  if (!validatePassword(password)) throw new Error('Use a password between 12 and 128 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  if (User.db.readyState === 1) {
    const user = await User.findOneAndUpdate({ _id: accountId, role: 'learner' }, { $set: { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true } }, { new: true }).lean();
    return Boolean(user);
  }
  const user = [...temporaryUsers.values()].find(item => item.id === accountId && item.role === 'learner');
  if (!user) return false;
  Object.assign(user, { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true });
  return true;
}

export async function hasAdminAccount() {
  if (User.db.readyState === 1) return (await User.exists({ role: 'admin' })) !== null;
  return [...temporaryUsers.values()].some(user => user.role === 'admin');
}

export async function getUserById(accountId) {
  if (User.db.readyState === 1) {
    const user = await User.findById(accountId).lean();
    return user ? { id: user._id.toString(), handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, researchConsent: user.researchConsent } : null;
  }
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  return user ? { id: user.id, handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, researchConsent: user.researchConsent } : null;
}

export async function setResearchConsent(accountId, version) {
  const acceptedAt = new Date();
  if (User.db.readyState === 1) {
    const user = await User.findByIdAndUpdate(accountId, { $set: { 'researchConsent.version': version, 'researchConsent.acceptedAt': acceptedAt } }, { new: true }).lean();
    return user ? { version: user.researchConsent.version, acceptedAt: user.researchConsent.acceptedAt } : null;
  }
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  if (!user) return null;
  user.researchConsent = { version, acceptedAt };
  return user.researchConsent;
}

export async function clearResearchConsent(accountId) {
  if (User.db.readyState === 1) {
    await User.findByIdAndUpdate(accountId, { $set: { researchConsent: { version: null, acceptedAt: null } } });
    return;
  }
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  if (user) user.researchConsent = { version: null, acceptedAt: null };
}

export async function listResearchConsentedParticipants() {
  if (User.db.readyState === 1) {
    const users = await User.find({ role: 'learner', 'researchConsent.acceptedAt': { $ne: null } }, { _id: 1, handle: 1, 'researchConsent.acceptedAt': 1 }).lean();
    return users.map(user => ({ id: user._id.toString(), handle: user.handle, acceptedAt: user.researchConsent.acceptedAt }));
  }
  return [...temporaryUsers.values()].filter(user => user.role === 'learner' && user.researchConsent?.acceptedAt).map(user => ({ id: user.id, handle: user.handle, acceptedAt: user.researchConsent.acceptedAt }));
}
