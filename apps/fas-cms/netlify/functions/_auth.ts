import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
const SESSION_SECRET = process.env.SESSION_SECRET!;

export function readSession(cookieHeader?: string) {
  const m = /(?:^|;\s*)session=([^;]+)/.exec(cookieHeader || '');
  return m?.[1];
}

function readCookie(cookieHeader: string | undefined, name: string) {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(cookieHeader || '');
  return m?.[1] || null;
}

export async function requireUser(event: { headers: { cookie?: string } }) {
  const raw = readSession(event.headers.cookie);
  if (raw) {
    try {
      const user = jwt.verify(raw, SESSION_SECRET) as any;
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: string) => (r || '').toLowerCase())
        : [];
      const ok = roles.includes('owner') || roles.includes('employee');
      if (!ok) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      return user;
    } catch {
      // fall through to token verification
    }
  }
  // Fallback: accept Auth0 ID token cookie (set by frontend) and verify roles from claims
  const token = readCookie(event.headers.cookie, 'token');
  const domain = process.env.AUTH0_DOMAIN || process.env.PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID || process.env.PUBLIC_AUTH0_CLIENT_ID;
  if (token && domain && clientId) {
    try {
      const JWKS = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://${domain}/`,
        audience: clientId,
      });
      const roles: string[] =
        (payload['https://login.fasmotorsports.com/fas/roles'] as any) ||
        (payload['https://fasmotorsports.com/roles'] as any) ||
        (payload['https://schemas.quickstarts.auth0.com/roles'] as any) ||
        [];
      const rolesNorm = Array.isArray(roles)
        ? (roles as string[]).map((r) => (r || '').toLowerCase())
        : [];
      const ok = rolesNorm.includes('owner') || rolesNorm.includes('employee');
      if (!ok) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
      return { sub: payload.sub, email: (payload as any).email, roles: rolesNorm } as any;
    } catch (e) {
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    }
  }
  throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
}
