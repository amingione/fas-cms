import jwt from 'jsonwebtoken';
const SESSION_SECRET = process.env.SESSION_SECRET!;

export function readSession(cookieHeader?: string) {
  const m = /(?:^|;\s*)session=([^;]+)/.exec(cookieHeader || '');
  return m?.[1];
}

export function requireUser(event: { headers: { cookie?: string } }) {
  const raw = readSession(event.headers.cookie);
  if (!raw) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    const user = jwt.verify(raw, SESSION_SECRET) as any;
    const ok = user.roles?.some((r: string) => ['owner', 'staff'].includes(r));
    if (!ok) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    return user;
  } catch {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
