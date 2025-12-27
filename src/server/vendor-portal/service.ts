import bcrypt from 'bcryptjs';
import { jsonResponse } from '@/server/http/responses';
import {
  createVendorAuthToken,
  findVendorAuthTokenByHash,
  getVendorByEmail,
  getVendorById,
  markVendorAuthTokenUsed,
  updateVendorLastLogin,
  updateVendorPassword,
  updateVendorPortalAccess,
  updateVendorStatus
} from '@/server/sanity-client';
import { clearSessionCookie, setSession } from '@/server/auth/session';
import { INVITE_EXPIRY_DAYS, PUBLIC_SITE_URL, RESET_EXPIRY_HOURS } from './config';
import { issueInvitationToken, issueResetToken, decodeToken, hashRawToken } from './tokens';
import { sendVendorEmail } from './email';
import { checkPwnedPassword, validatePasswordComplexity } from './passwords';
import { rateLimit } from './rateLimit';

function buildBaseUrl(request: Request) {
  const origin = PUBLIC_SITE_URL || new URL(request.url).origin;
  return origin.replace(/\/+$/, '');
}

export async function handleInvite(body: any, session: any, request: Request) {
  const vendorId = String(body?.vendorId || '').trim();
  const invitedBy = String(body?.invitedBy || session?.user?.id || '').trim() || null;

  const rl = rateLimit(`invite:${invitedBy || 'anon'}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return jsonResponse(
      { message: 'Too many invitations sent. Please try again later.' },
      { status: 429 },
      { noIndex: true }
    );
  }

  if (!vendorId) {
    return jsonResponse({ message: 'vendorId is required' }, { status: 400 }, { noIndex: true });
  }
  const vendor = await getVendorById(vendorId);
  if (!vendor) {
    return jsonResponse({ message: 'Vendor not found' }, { status: 404 }, { noIndex: true });
  }

  const portalAccess = (vendor as any).portalAccess || {};
  const enabled = portalAccess.enabled ?? false;
  const portalEmail = String(
    portalAccess.email ||
      (vendor as any)?.primaryContact?.email ||
      (vendor as any)?.accountingContact?.email ||
      ''
  ).trim();
  if (!enabled) {
    return jsonResponse({ message: 'Portal access is disabled for this vendor.' }, { status: 400 }, { noIndex: true });
  }
  if (!portalEmail) {
    return jsonResponse({ message: 'Vendor portal email is missing.' }, { status: 400 }, { noIndex: true });
  }

  const issued = issueInvitationToken(vendor._id, portalEmail);
  await createVendorAuthToken({
    vendorId: vendor._id,
    tokenHash: issued.tokenHash,
    tokenType: 'invitation',
    expiresAt: issued.expiresAt.toISOString(),
    invitedBy: invitedBy || undefined
  });
  await updateVendorPortalAccess(vendor._id, {
    invitedAt: new Date().toISOString(),
    invitedBy,
    setupToken: issued.token,
    setupTokenExpiry: issued.expiresAt.toISOString(),
    setupCompletedAt: null
  });

  const baseUrl = buildBaseUrl(request);
  const invitationLink = `${baseUrl}/vendor-portal/setup?token=${encodeURIComponent(issued.token)}`;
  await sendVendorEmail(portalEmail, 'vendor-portal-invitation', {
    invitationLink,
    vendorName: vendor.name || 'Vendor',
    expirationTime: `${INVITE_EXPIRY_DAYS} days`
  });

  return jsonResponse({ ok: true, invitationLink }, { status: 200 }, { noIndex: true });
}

export async function validateInvitationToken(token: string) {
  const decoded = decodeToken(token);
  if (!decoded.valid) {
    return { valid: false, message: decoded.message || 'Invalid token' };
  }
  const payload = decoded.payload || {};
  if (payload.purpose !== 'invitation') {
    return { valid: false, message: 'Wrong token type' };
  }
  const tokenHash = hashRawToken(token);
  const stored = await findVendorAuthTokenByHash(tokenHash, 'invitation');
  if (!stored) return { valid: false, message: 'Invitation expired or already used' };
  return { valid: true, vendor: stored.vendor, tokenId: stored._id };
}

export async function completeInvitation({
  token,
  password,
  request
}: {
  token: string;
  password: string;
  request: Request;
}) {
  const validation = await validateInvitationToken(token);
  if (!validation.valid || !validation.vendor || !validation.tokenId) {
    return jsonResponse({ message: validation.message || 'Invalid token' }, { status: 400 }, { noIndex: true });
  }
  const vendor = validation.vendor as any;
  const complexity = validatePasswordComplexity(password);
  if (!complexity.ok) {
    return jsonResponse({ message: complexity.errors.join(' ') }, { status: 400 }, { noIndex: true });
  }
  const pwned = await checkPwnedPassword(password);
  if (pwned) {
    return jsonResponse({ message: 'Choose a password that has not appeared in known breaches.' }, { status: 400 }, { noIndex: true });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await updateVendorPassword(vendor._id, passwordHash);
  await markVendorAuthTokenUsed(validation.tokenId);
  await updateVendorLastLogin(vendor._id);
  await updateVendorStatus(vendor._id, 'Approved');

  const headers = new Headers();
  const roles = Array.isArray(vendor.portalAccess?.permissions)
    ? vendor.portalAccess.permissions.map((p: any) => String(p || '').toLowerCase())
    : ['vendor'];
  const vendorEmail =
    vendor.portalAccess?.email ||
    (vendor as any)?.primaryContact?.email ||
    (vendor as any)?.accountingContact?.email ||
    '';
  setSession(headers, { id: vendor._id, email: vendorEmail, roles }, { expiresIn: '7d' });

  return jsonResponse(
    {
      ok: true,
      redirect: '/vendor-portal/dashboard'
    },
    { status: 200, headers },
    { noIndex: true }
  );
}

export async function validateResetToken(token: string) {
  const decoded = decodeToken(token);
  if (!decoded.valid) return { valid: false, message: decoded.message || 'Invalid token' };
  const payload = decoded.payload || {};
  if (payload.purpose !== 'password-reset') {
    return { valid: false, message: 'Wrong token type' };
  }
  const tokenHash = hashRawToken(token);
  const stored = await findVendorAuthTokenByHash(tokenHash, 'password-reset');
  if (!stored) return { valid: false, message: 'Reset token expired or already used' };
  return { valid: true, vendor: stored.vendor, tokenId: stored._id };
}

export async function requestPasswordReset(email: string, request: Request) {
  const rl = rateLimit(`reset:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return jsonResponse(
      { ok: true, message: 'If an account exists, we sent a reset link.' },
      { status: 200 },
      { noIndex: true }
    );
  }

  const vendor = await getVendorByEmail(email);
  const portalAccess = (vendor as any)?.portalAccess || {};
  if (!vendor || !portalAccess.enabled) {
    console.warn('[vendor reset] no send: vendor missing or portal access disabled', {
      email,
      found: Boolean(vendor),
      enabled: Boolean(portalAccess.enabled)
    });
    return jsonResponse(
      { ok: true, message: 'If an account exists, we sent a reset link.' },
      { status: 200 },
      { noIndex: true }
    );
  }
  const issued = issueResetToken(vendor._id, email);
  await createVendorAuthToken({
    vendorId: vendor._id,
    tokenHash: issued.tokenHash,
    tokenType: 'password-reset',
    expiresAt: issued.expiresAt.toISOString()
  });

  const baseUrl = buildBaseUrl(request);
  const resetLink = `${baseUrl}/vendor-portal/reset-password?token=${encodeURIComponent(issued.token)}`;
  await sendVendorEmail(email, 'vendor-password-reset', {
    resetLink,
    vendorName: vendor.name || 'Vendor',
    expirationTime: `${RESET_EXPIRY_HOURS} hour`
  });
  console.info('[vendor reset] sent email', { email, vendorId: vendor._id, resetLink });

  return jsonResponse(
    { ok: true, message: 'If an account exists, we sent a reset link.' },
    { status: 200 },
    { noIndex: true }
  );
}

export async function completePasswordReset({
  token,
  password
}: {
  token: string;
  password: string;
}) {
  const validation = await validateResetToken(token);
  if (!validation.valid || !validation.vendor || !validation.tokenId) {
    return jsonResponse({ message: validation.message || 'Invalid token' }, { status: 400 }, { noIndex: true });
  }
  const complexity = validatePasswordComplexity(password);
  if (!complexity.ok) {
    return jsonResponse({ message: complexity.errors.join(' ') }, { status: 400 }, { noIndex: true });
  }
  const pwned = await checkPwnedPassword(password);
  if (pwned) {
    return jsonResponse({ message: 'Choose a password that has not appeared in known breaches.' }, { status: 400 }, { noIndex: true });
  }

  const hash = await bcrypt.hash(password, 10);
  await updateVendorPassword((validation.vendor as any)._id, hash);
  await markVendorAuthTokenUsed(validation.tokenId);

  const headers = new Headers();
  clearSessionCookie(headers);
  return jsonResponse({ ok: true }, { status: 200, headers }, { noIndex: true });
}

export function requireAdmin(session: any) {
  const roles: string[] = session?.user?.roles || [];
  const isAdmin = roles.some((r) => ['admin', 'staff', 'manager'].includes(String(r || '').toLowerCase()));
  return isAdmin;
}
