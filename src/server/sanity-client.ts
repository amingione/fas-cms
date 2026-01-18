import { createClient } from '@sanity/client';

// Read envs in a way that works in Node/serverless execution and Astro development.
// In Astro, env vars from .env files are available via import.meta.env, not process.env.
const processEnv = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<
  string,
  string | undefined
>;
const metaEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) as Record<
  string,
  string | undefined
>;

// Check both process.env (for Node/serverless) and import.meta.env (for Astro dev)
const getEnv = (key: string): string | undefined => {
  return processEnv[key] || metaEnv[key];
};

const projectId =
  getEnv('SANITY_PROJECT_ID') ||
  getEnv('SANITY_STUDIO_PROJECT_ID') ||
  getEnv('PUBLIC_SANITY_PROJECT_ID') ||
  getEnv('VITE_SANITY_PROJECT_ID');

const dataset =
  getEnv('SANITY_DATASET') ||
  getEnv('SANITY_STUDIO_DATASET') ||
  getEnv('PUBLIC_SANITY_DATASET') ||
  getEnv('VITE_SANITY_DATASET') ||
  'production';

const token =
  getEnv('SANITY_WRITE_TOKEN') ||
  getEnv('SANITY_API_TOKEN') ||
  getEnv('SANITY_API_READ_TOKEN') ||
  getEnv('VITE_SANITY_API_TOKEN') ||
  getEnv('VITE_SANITY_WRITE_TOKEN') ||
  getEnv('SANITY_READ_TOKEN');

const apiVersion = getEnv('SANITY_API_VERSION') || '2024-01-01';

if (!projectId) {
  console.warn(
    '[sanity-client] Missing SANITY projectId. Checked SANITY_* / PUBLIC_SANITY_* / VITE_* in process.env and import.meta.env'
  );
  throw new Error('Sanity client misconfigured: missing SANITY_PROJECT_ID / PUBLIC_SANITY_PROJECT_ID');
}

export const sanity = createClient({ projectId, dataset, apiVersion, token, useCdn: !token });
export const hasWriteToken = Boolean(token);

export async function getVendorByEmail(email: string) {
  const query =
    '*[_type == "vendor" && (lower(portalAccess.email) == $e || lower(primaryContact.email) == $e || lower(accountingContact.email) == $e)][0]';
  return await sanity.fetch(query, { e: String(email || '').trim().toLowerCase() });
}

export async function getVendorById(id: string) {
  const query = '*[_type == "vendor" && _id == $id][0]';
  return await sanity.fetch(query, { id });
}

export async function getVendorByCustomerId(customerId: string) {
  const normalizedId = String(customerId || '').replace(/^drafts\./, '');
  const query = '*[_type == "vendor" && customerRef._ref == $id][0]';
  return await sanity.fetch(query, { id: normalizedId });
}

export async function setVendorPasswordReset(vendorId: string, tokenHash: string, expiresAt: string) {
  await sanity
    .patch(vendorId)
    .set({ passwordResetToken: tokenHash, passwordResetExpires: expiresAt })
    .commit();
}

export async function updateVendorPortalAccess(vendorId: string, fields: Record<string, unknown>) {
  const prefixed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    prefixed[`portalAccess.${key}`] = value;
  }
  await sanity.patch(vendorId).set(prefixed).commit();
}

export async function updateVendorPassword(vendorId: string, passwordHash: string) {
  await sanity
    .patch(vendorId)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
    .commit();
}

export async function setCustomerPasswordReset(customerId: string, tokenHash: string, expiresAt: string) {
  await sanity
    .patch(customerId)
    .set({ passwordResetToken: tokenHash, passwordResetExpires: expiresAt })
    .commit();
}

export async function updateCustomerPassword(customerId: string, passwordHash: string) {
  await sanity
    .patch(customerId)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
    .commit();
}

export async function getVendorBySub(sub: string) {
  const query = '*[_type == "vendor" && portalAccess.userSub == $sub][0]';
  return await sanity.fetch(query, { sub });
}

export async function createVendorAuthToken(data: {
  vendorId: string;
  tokenHash: string;
  tokenType: 'invitation' | 'password-reset';
  expiresAt: string;
  invitedBy?: string;
}) {
  const doc = {
    _type: 'vendorAuthToken',
    vendor: { _type: 'reference', _ref: data.vendorId },
    tokenHash: data.tokenHash,
    tokenType: data.tokenType,
    expiresAt: data.expiresAt,
    usedAt: null,
    invitedBy: data.invitedBy || null,
    createdAt: new Date().toISOString()
  };
  return await sanity.create(doc);
}

export async function markVendorAuthTokenUsed(tokenId: string) {
  return await sanity.patch(tokenId).set({ usedAt: new Date().toISOString() }).commit();
}

export async function findVendorAuthTokenByHash(tokenHash: string, tokenType: 'invitation' | 'password-reset') {
  const query =
    '*[_type == "vendorAuthToken" && tokenHash == $hash && tokenType == $type && (!defined(usedAt) || usedAt == null) && expiresAt > now()][0]{..., vendor->{_id, name, email, portalAccess}}';
  return await sanity.fetch(query, { hash: tokenHash, type: tokenType });
}

export async function updateVendorLastLogin(vendorId: string) {
  await sanity.patch(vendorId).set({ 'portalAccess.lastLogin': new Date().toISOString() }).commit();
}

export async function updateVendorStatus(vendorId: string, status: string) {
  await sanity.patch(vendorId).set({ status }).commit();
}

export async function getCustomerByEmail(email: string) {
  const query = '*[_type == "customer" && lower(email) == $e][0]';
  return await sanity.fetch(query, { e: String(email || '').trim().toLowerCase() });
}

export async function getVendorOrdersByVendorId(vendorId: string) {
  const query = '*[_type == "vendor" && _id == $vid][0].orders[] { orderId, status, amount, createdAt }';
  return await sanity.fetch(query, { vid: vendorId });
}

export async function getAllOrders() {
  const query = '*[_type == "order"] | order(createdAt desc) { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, {});
}
