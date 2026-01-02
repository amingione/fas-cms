import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { INVITE_EXPIRY_DAYS, JWT_SECRET, RESET_EXPIRY_HOURS } from './config';

export type TokenPurpose = 'invitation' | 'password-reset';

export interface IssuedToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

const DEFAULT_ISSUER = 'vendor-portal';

function signToken(payload: Record<string, unknown>, expiresIn: string | number) {
  const secret = JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to sign vendor portal tokens');
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer: DEFAULT_ISSUER
  };
  return jwt.sign(payload, secret, options);
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function issueInvitationToken(vendorId: string, email: string): IssuedToken {
  const token = signToken(
    { vendorId, email, purpose: 'invitation' as TokenPurpose },
    `${INVITE_EXPIRY_DAYS}d`
  );
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function issueResetToken(vendorId: string, email: string): IssuedToken {
  const token = signToken(
    { vendorId, email, purpose: 'password-reset' as TokenPurpose },
    `${RESET_EXPIRY_HOURS}h`
  );
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

export function decodeToken(token: string): { valid: boolean; payload?: any; message?: string } {
  try {
    if (!JWT_SECRET) throw new Error('JWT_SECRET missing');
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: DEFAULT_ISSUER });
    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, message: err?.message || 'Invalid token' };
  }
}

export function hashRawToken(token: string) {
  return hashToken(token);
}
