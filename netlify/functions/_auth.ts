import jwt from 'jsonwebtoken';
const SESSION_SECRET = process.env.SESSION_SECRET!;

export function readSession(cookieHeader?: string) {
  const m = /(?:^|;\s*)fas_session=([^;]+)/.exec(cookieHeader || '');
  return m?.[1];
}

export async function requireUser(event: { headers: { cookie?: string } }) {
  const raw = readSession(event.headers.cookie);
  if (!raw) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    const user = jwt.verify(raw, SESSION_SECRET) as any;
    const roles: string[] = Array.isArray(user?.roles)
      ? user.roles.map((r: string) => (r || '').toLowerCase())
      : [];
    const ok = roles.includes('owner') || roles.includes('employee') || roles.includes('admin') || roles.includes('staff');
    if (!ok) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
    return user;
  } catch {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
