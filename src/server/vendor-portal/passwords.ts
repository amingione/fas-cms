import crypto from 'node:crypto';

const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range/';

export type PasswordCheckResult = {
  ok: boolean;
  errors: string[];
  pwned?: boolean;
};

export function validatePasswordComplexity(password: string): PasswordCheckResult {
  const errors: string[] = [];
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long.');
  }
  if (!/[A-Z]/.test(password)) errors.push('Include at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Include at least one lowercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Include at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Include at least one special character.');
  return { ok: errors.length === 0, errors };
}

export async function checkPwnedPassword(password: string): Promise<boolean | null> {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`${HIBP_ENDPOINT}${prefix}`, {
      method: 'GET',
      headers: { Accept: 'text/plain' }
    });
    if (!res.ok) return null;
    const body = await res.text();
    const lines = body.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const found = Number(count || '0');
        return Number.isFinite(found) && found > 0;
      }
    }
    return false;
  } catch (err) {
    console.warn('[hibp] lookup failed', err);
    return null;
  }
}
