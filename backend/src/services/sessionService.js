import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getUserById } from './authService.js';

if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET === 'replace-with-a-random-secret-of-at-least-32-characters')) {
  throw new Error('Set SESSION_SECRET to a unique private value of at least 32 characters in production.');
}
const secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const cookieName = 'cyberwolf_session';
const sessionDurationSeconds = role => role === 'learner' ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

function sign(payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSession(account) {
  const payload = Buffer.from(JSON.stringify({ sub: account.id, handle: account.handle, username: account.username ?? null, role: account.role, exp: Math.floor(Date.now() / 1000) + sessionDurationSeconds(account.role) })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function makeSessionCookie(token, role = 'admin') {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionDurationSeconds(role)}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

function readCookie(header = '') {
  const pair = header.split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`));
  return pair?.slice(cookieName.length + 1);
}

function verifyToken(token) {
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.sub || !claims.handle || !['learner', 'admin'].includes(claims.role) || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { accountId: claims.sub, handle: claims.handle, username: claims.username ?? null, role: claims.role };
  } catch { return null; }
}

export function attachSession(req, _res, next) {
  req.account = verifyToken(readCookie(req.headers.cookie));
  next();
}

export async function requireAuth(req, res, next) {
  if (!req.account) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    const account = await getUserById(req.account.accountId);
    if (!account) return res.status(401).json({ error: 'This account is no longer active. Sign in again.' });
    req.account = { ...req.account, handle: account.handle, username: account.username ?? req.account.username, role: account.role, credentialsConfigured: account.credentialsConfigured === true, mustChangePassword: account.mustChangePassword === true, researchConsent: account.researchConsent };
    if (req.account.mustChangePassword && !['/api/auth/me', '/api/auth/learner-password'].includes(req.path)) return res.status(403).json({ error: 'Set a new password before continuing.' });
  } catch (error) { return next(error); }
  return next();
}

export function requireRole(role) {
  return (req, res, next) => requireAuth(req, res, error => {
    if (error) return next(error);
    if (req.account.role !== role) return res.status(403).json({ error: 'You do not have permission to use this feature.' });
    return next();
  });
}

export function requireStudyConsent(req, res, next) {
  const currentVersion = process.env.STUDY_INFO_VERSION || 'draft-5';
  if (req.account?.role === 'admin' || (req.account?.researchConsent?.acceptedAt && req.account.researchConsent.version === currentVersion)) return next();
  return res.status(403).json({ error: 'Research participation is not enabled for this account. Choose to participate or continue in practice-only mode.' });
}
