import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fas_session';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || '';
const SECURE = process.env.SESSION_SECURE === 'true';
const SAME_SITE = (process.env.SESSION_SAMESITE || 'lax') as 'lax' | 'strict' | 'none';

if (!SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET is not configured. Set it to a random 32+ char string.');
}

export interface SessionUser {
  id: string;
  email?: string;
  roles: string[];
}

export interface SessionPayload extends SessionUser {
  sub?: string;
  iat?: number;
  exp?: number;
}

export function createSessionToken(user: SessionUser, options: jwt.SignOptions = {}) {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: Array.isArray(user.roles) ? user.roles : []
  };
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET is required to sign session tokens');
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '7d', ...options });
}

export function setSessionCookie(headers: Headers, token: string) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${SAME_SITE}`,
    SECURE ? 'Secure' : ''
  ].filter(Boolean);
  headers.append('Set-Cookie', parts.join('; '));
}

export function setSession(headers: Headers, user: SessionUser, options: jwt.SignOptions = {}) {
  const token = createSessionToken(user, options);
  setSessionCookie(headers, token);
  return token;
}

export function clearSessionCookie(headers: Headers) {
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=${SAME_SITE}; ${SECURE ? 'Secure' : ''}`
  );
}

function verify(token: string): SessionPayload | null {
  try {
    if (!SESSION_SECRET) throw new Error('SESSION_SECRET missing');
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function readSession(request: Request): Promise<{ status: number; session: { user: SessionUser; exp?: number } | null }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const jar = parse(cookieHeader);
  const token = jar[COOKIE_NAME];
  if (!token) return { status: 401, session: null };
  const claims = verify(token);
  if (!claims || !claims.sub) return { status: 401, session: null };

  const roles = Array.isArray(claims.roles)
    ? claims.roles.map((r) => String(r || '').toLowerCase())
    : claims.roles
    ? [String(claims.roles).toLowerCase()]
    : [];

  const user: SessionUser = {
    id: claims.sub,
    email: claims.email,
    roles
  };
  return { status: 200, session: { user, exp: claims.exp } };
}
