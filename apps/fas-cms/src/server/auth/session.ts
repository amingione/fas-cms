import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

// Name of the session cookie.  Must match value in `.env` or defaults.
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'fas_session';
const SECURE = process.env.SESSION_SECURE === 'true';
const SAME_SITE = (process.env.SESSION_SAMESITE || 'lax') as 'lax' | 'strict' | 'none';

/**
 * Set the session cookie.  Stores a JWT returned by Auth0.  The cookie is
 * HttpOnly so it is not accessible from the browser.
 */
export function setSessionCookie(headers: Headers, jwt: string) {
  const parts = [
    `${COOKIE_NAME}=${jwt}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${SAME_SITE}`,
    SECURE ? 'Secure' : '',
  ].filter(Boolean);
  headers.append('Set-Cookie', parts.join('; '));
}

/**
 * Clear the session cookie.  Used during logout.
 */
export function clearSessionCookie(headers: Headers) {
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=${SAME_SITE}; ${SECURE ? 'Secure' : ''}`,
  );
}

/**
 * Verify a JWT.  In production you should verify the signature of the
 * token using your own signing key or a JSON Web Key (JWK) set.  This
 * example simply decodes the token without validation.  Replace this
 * with a call to a JWT verification library appropriate for your
 * authentication system.
 */
async function verify(token: string): Promise<any | null> {
  try {
    const claims = jwt.decode(token) as any;
    if (!claims || !claims.sub) return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * Read the session from the request.  Returns `{ status, session }` where
 * `status` is an HTTP status code and `session` is the parsed user object.
 */
export async function readSession(request: Request): Promise<{ status: number; session: any | null }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const jar = parse(cookieHeader);
  const token = jar[COOKIE_NAME];
  if (!token) return { status: 401, session: null };
  const claims = await verify(token);
  if (!claims) return { status: 401, session: null };
  const user = {
    id: claims.sub,
    email: claims.email,
    role: claims.role as 'customer' | 'vendor' | 'admin' | undefined,
  };
  return { status: 200, session: { user, exp: claims.exp } };
}
