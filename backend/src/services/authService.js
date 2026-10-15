import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { User } from '../models/User.js';
import { LearnerCodeCounter } from '../models/LearnerCodeCounter.js';
import { loadLocalMap, saveLocalMap } from './localPersistence.js';

const scrypt = promisify(nodeScrypt);
const temporaryUsers = new Map();
const ensureTemporaryUsers = () => loadLocalMap('users.json', temporaryUsers);

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && password.trim().length > 0;
}

export function validateAdminUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9._-]{3,32}$/.test(username.trim());
}

function randomAdminHandle() {
  return `wolf-${randomBytes(5).toString('hex')}`;
}

async function nextLearnerHandle() {
  if (User.db.readyState === 1) {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const counter = await LearnerCodeCounter.findOneAndUpdate(
        { _id: 'learner-code' }, { $inc: { sequence: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: false },
      );
      const handle = `wolf-${counter.sequence}`;
      if (!await User.exists({ handle })) return handle;
    }
    throw new Error('Could not allocate a unique learner code.');
  }
  await ensureTemporaryUsers();
  const highest = [...temporaryUsers.values()].reduce((max, user) => {
    const match = /^wolf-(\d+)$/.exec(user.handle);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  let sequence = highest + 1;
  while (temporaryUsers.has(`wolf-${sequence}`)) sequence += 1;
  return `wolf-${sequence}`;
}

export async function createUser(password, role = 'learner', username = null) {
  if (User.db.readyState !== 1) await ensureTemporaryUsers();
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
    const handle = role === 'learner' ? await nextLearnerHandle() : randomAdminHandle();
    try {
      if (User.db.readyState === 1) {
        const user = await User.create({ handle, ...(normalizedUsername ? { username: normalizedUsername } : {}), passwordSalt: salt, passwordHash: hash, credentialsConfigured: role === 'learner', role });
        return { id: user._id.toString(), handle: user.handle, username: user.username, role: user.role, credentialsConfigured: role === 'learner', researchConsent: user.researchConsent };
      }
      if (temporaryUsers.has(handle)) continue;
      if (role === 'admin' && [...temporaryUsers.values()].some(item => item.username === normalizedUsername)) throw new Error('An account already uses that admin username.');
      const user = { id: randomBytes(16).toString('hex'), handle, username: normalizedUsername, passwordSalt: salt, passwordHash: hash, credentialsConfigured: role === 'learner', role, researchConsent: { version: null, acceptedAt: null } };
      temporaryUsers.set(handle, user);
      await saveLocalMap('users.json', temporaryUsers);
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
  if (User.db.readyState !== 1) await ensureTemporaryUsers();
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
  const studyVersion = process.env.STUDY_INFO_VERSION || 'draft-5';
  if (user.role === 'learner' && user.researchConsent?.acceptedAt && user.researchConsent.version === studyVersion) {
    try {
      const loginAt = new Date();
      if (User.db.readyState === 1) {
        await User.updateOne({ _id: user._id }, { $push: { loginEvents: { $each: [loginAt], $slice: -500 } } });
      } else {
        user.loginEvents = [...(user.loginEvents ?? []), loginAt.toISOString()].slice(-500);
        await saveLocalMap('users.json', temporaryUsers);
      }
    } catch { /* Keep authentication available if analytics storage is temporarily unavailable. */ }
  }
  return { id: user._id?.toString() ?? user.id, handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, mustChangePassword: user.mustChangePassword === true, researchConsent: user.researchConsent };
}

export async function authenticateAdmin(username, password) {
  if (!validateAdminUsername(username) || typeof password !== 'string') return null;
  if (User.db.readyState !== 1) await ensureTemporaryUsers();
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
    else {
      user.username = normalizedUsername;
      await saveLocalMap('users.json', temporaryUsers);
    }
  }
  return { id: user._id?.toString() ?? user.id, handle: user.handle, username: user.username ?? user.handle, role: user.role, researchConsent: user.researchConsent };
}

export async function setLearnerPassword(accountId, password) {
  if (!validatePassword(password)) throw new Error('Use a password between 12 and 128 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  if (User.db.readyState === 1) {
    const user = await User.findOneAndUpdate({ _id: accountId, role: 'learner' }, { $set: { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true, mustChangePassword: false, passwordResetRequestedAt: null } }, { new: true }).lean();
    return Boolean(user);
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId && item.role === 'learner');
  if (!user) return false;
  Object.assign(user, { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true, mustChangePassword: false, passwordResetRequestedAt: null });
  await saveLocalMap('users.json', temporaryUsers);
  return true;
}

export async function hasAdminAccount() {
  if (User.db.readyState === 1) return (await User.exists({ role: 'admin' })) !== null;
  await ensureTemporaryUsers();
  return [...temporaryUsers.values()].some(user => user.role === 'admin');
}

export async function getUserById(accountId) {
  if (User.db.readyState === 1) {
    const user = await User.findById(accountId).lean();
    return user ? { id: user._id.toString(), handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, mustChangePassword: user.mustChangePassword === true, researchConsent: user.researchConsent } : null;
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  return user ? { id: user.id, handle: user.handle, username: user.username, role: user.role, credentialsConfigured: user.credentialsConfigured === true, mustChangePassword: user.mustChangePassword === true, researchConsent: user.researchConsent } : null;
}

export async function requestLearnerPasswordReset(handle) {
  if (typeof handle !== 'string') return;
  const normalizedHandle = handle.trim().toLowerCase();
  if (User.db.readyState === 1) {
    await User.updateOne({ handle: normalizedHandle, role: 'learner' }, { $set: { passwordResetRequestedAt: new Date() } });
    return;
  }
  await ensureTemporaryUsers();
  const user = temporaryUsers.get(normalizedHandle);
  if (!user || user.role !== 'learner') return;
  user.passwordResetRequestedAt = new Date().toISOString();
  await saveLocalMap('users.json', temporaryUsers);
}

export async function listLearnersForAdmin() {
  if (User.db.readyState === 1) {
    const learners = await User.find({ role: 'learner' }, { handle: 1, passwordResetRequestedAt: 1, mustChangePassword: 1 }).sort({ handle: 1 }).lean();
    return learners.map(user => ({ id: user._id.toString(), handle: user.handle, resetRequestedAt: user.passwordResetRequestedAt, mustChangePassword: user.mustChangePassword === true }));
  }
  await ensureTemporaryUsers();
  return [...temporaryUsers.values()].filter(user => user.role === 'learner').sort((a, b) => a.handle.localeCompare(b.handle, undefined, { numeric: true })).map(user => ({ id: user.id, handle: user.handle, resetRequestedAt: user.passwordResetRequestedAt ?? null, mustChangePassword: user.mustChangePassword === true }));
}

export async function renameLearnerCode(accountId, newHandle) {
  if (typeof newHandle !== 'string' || !/^wolf-[1-9]\d{0,8}$/.test(newHandle.trim())) throw new Error('Learner codes must use the format wolf-1.');
  const handle = newHandle.trim().toLowerCase();
  if (User.db.readyState === 1) {
    try {
      const user = await User.findOneAndUpdate({ _id: accountId, role: 'learner' }, { $set: { handle } }, { new: true, runValidators: true }).lean();
      return user ? { id: user._id.toString(), handle: user.handle } : null;
    } catch (error) {
      if (error?.code === 11000) throw new Error('That learner code is already in use.');
      throw error;
    }
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId && item.role === 'learner');
  if (!user) return null;
  if (temporaryUsers.has(handle) && temporaryUsers.get(handle).id !== accountId) throw new Error('That learner code is already in use.');
  temporaryUsers.delete(user.handle);
  user.handle = handle;
  temporaryUsers.set(handle, user);
  await saveLocalMap('users.json', temporaryUsers);
  return { id: user.id, handle: user.handle };
}

export async function adminResetLearnerPassword(accountId) {
  const temporaryPassword = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(temporaryPassword, salt, 64)).toString('hex');
  if (User.db.readyState === 1) {
    const user = await User.findOneAndUpdate(
      { _id: accountId, role: 'learner', passwordResetRequestedAt: { $ne: null } },
      { $set: { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true, mustChangePassword: true, passwordResetRequestedAt: null } },
      { new: true },
    ).lean();
    return user ? { handle: user.handle, temporaryPassword } : null;
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId && item.role === 'learner' && item.passwordResetRequestedAt);
  if (!user) return null;
  Object.assign(user, { passwordSalt: salt, passwordHash: hash, credentialsConfigured: true, mustChangePassword: true, passwordResetRequestedAt: null });
  await saveLocalMap('users.json', temporaryUsers);
  return { handle: user.handle, temporaryPassword };
}

export async function setResearchConsent(accountId, version) {
  const acceptedAt = new Date();
  if (User.db.readyState === 1) {
    const user = await User.findByIdAndUpdate(accountId, { $set: { 'researchConsent.version': version, 'researchConsent.acceptedAt': acceptedAt } }, { new: true }).lean();
    return user ? { version: user.researchConsent.version, acceptedAt: user.researchConsent.acceptedAt } : null;
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  if (!user) return null;
  user.researchConsent = { version, acceptedAt };
  await saveLocalMap('users.json', temporaryUsers);
  return user.researchConsent;
}

export async function clearResearchConsent(accountId) {
  if (User.db.readyState === 1) {
    await User.findByIdAndUpdate(accountId, { $set: { researchConsent: { version: null, acceptedAt: null }, loginEvents: [] } });
    return;
  }
  await ensureTemporaryUsers();
  const user = [...temporaryUsers.values()].find(item => item.id === accountId);
  if (user) {
    user.researchConsent = { version: null, acceptedAt: null };
    user.loginEvents = [];
    await saveLocalMap('users.json', temporaryUsers);
  }
}

export async function listResearchConsentedParticipants() {
  if (User.db.readyState === 1) {
    const users = await User.find({ role: 'learner', 'researchConsent.acceptedAt': { $ne: null } }, { _id: 1, handle: 1, 'researchConsent.acceptedAt': 1, loginEvents: 1 }).lean();
    return users.map(user => ({ id: user._id.toString(), handle: user.handle, acceptedAt: user.researchConsent.acceptedAt, loginEvents: user.loginEvents ?? [] }));
  }
  await ensureTemporaryUsers();
  return [...temporaryUsers.values()].filter(user => user.role === 'learner' && user.researchConsent?.acceptedAt).map(user => ({ id: user.id, handle: user.handle, acceptedAt: user.researchConsent.acceptedAt, loginEvents: user.loginEvents ?? [] }));
}
