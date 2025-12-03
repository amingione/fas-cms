import crypto from 'node:crypto';

const env = typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {};
const penv = typeof process !== 'undefined' ? (process as any).env ?? {} : {};

const readEnv = (key: string, fallback?: string) => {
  const value = env[key] ?? penv[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

export const JWT_SECRET =
  readEnv('JWT_SECRET') ||
  readEnv('NEXTAUTH_SECRET') ||
  readEnv('SESSION_SECRET') ||
  readEnv('SESSION_KEY');

export const RESEND_API_KEY = readEnv('RESEND_API_KEY');
export const RESEND_FROM =
  readEnv('RESEND_VENDOR_FROM') || readEnv('RESEND_FROM') || 'vendor@updates.fasmotorsports.com';

export const PUBLIC_SITE_URL =
  readEnv('PUBLIC_SITE_URL') || readEnv('PUBLIC_BASE_URL') || readEnv('NEXTAUTH_URL');

export const INVITE_EXPIRY_DAYS = 7;
export const RESET_EXPIRY_HOURS = 1;
export const PASSWORD_MIN_LENGTH = 12;

export function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
