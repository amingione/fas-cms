import { createClient } from '@sanity/client';

// Read envs in a way that works in both Vite/SSR and Node/serverless.
// Prefer import.meta.env (configured via envPrefix) and fall back to process.env.
const ime = (typeof import.meta !== 'undefined' ? (import.meta as any).env : {}) as Record<string, string | undefined>;
const penv = (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string | undefined>;

const projectId =
  ime.SANITY_PROJECT_ID ||
  ime.SANITY_STUDIO_PROJECT_ID ||
  ime.PUBLIC_SANITY_PROJECT_ID ||
  ime.VITE_SANITY_PROJECT_ID ||
  penv.SANITY_PROJECT_ID ||
  penv.SANITY_STUDIO_PROJECT_ID ||
  penv.PUBLIC_SANITY_PROJECT_ID ||
  penv.VITE_SANITY_PROJECT_ID;

const dataset =
  ime.SANITY_DATASET ||
  ime.SANITY_STUDIO_DATASET ||
  ime.PUBLIC_SANITY_DATASET ||
  ime.VITE_SANITY_DATASET ||
  penv.SANITY_DATASET ||
  penv.SANITY_STUDIO_DATASET ||
  penv.PUBLIC_SANITY_DATASET ||
  penv.VITE_SANITY_DATASET ||
  'production';

const token =
  ime.SANITY_WRITE_TOKEN ||
  ime.SANITY_API_TOKEN ||
  ime.VITE_SANITY_API_TOKEN ||
  ime.VITE_SANITY_WRITE_TOKEN ||
  ime.SANITY_READ_TOKEN ||
  penv.SANITY_WRITE_TOKEN ||
  penv.SANITY_API_TOKEN ||
  penv.VITE_SANITY_API_TOKEN ||
  penv.VITE_SANITY_WRITE_TOKEN ||
  penv.SANITY_READ_TOKEN;

const apiVersion = ime.SANITY_API_VERSION || penv.SANITY_API_VERSION || '2024-10-01';

if (!projectId) {
  console.warn('[sanity-client] Missing SANITY projectId. Checked SANITY_* / PUBLIC_SANITY_* / VITE_* in import.meta.env and process.env');
  throw new Error('Sanity client misconfigured: missing SANITY_PROJECT_ID / PUBLIC_SANITY_PROJECT_ID');
}

export const sanity = createClient({ projectId, dataset, apiVersion, token, useCdn: !token });

export async function getVendorByEmail(email: string) {
  const query = '*[_type == "vendor" && lower(email) == $e][0]';
  return await sanity.fetch(query, { e: String(email || '').trim().toLowerCase() });
}

export async function setVendorPasswordReset(vendorId: string, tokenHash: string, expiresAt: string) {
  await sanity
    .patch(vendorId)
    .set({ passwordResetToken: tokenHash, passwordResetExpires: expiresAt })
    .commit();
}

export async function updateVendorPassword(vendorId: string, passwordHash: string) {
  await sanity
    .patch(vendorId)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
    .commit();
}

export async function getVendorBySub(sub: string) {
  const query = '*[_type == "vendor" && userSub == $sub][0]';
  return await sanity.fetch(query, { sub });
}

export async function getCustomerByEmail(email: string) {
  const query = '*[_type == "customer" && lower(email) == $e][0]';
  return await sanity.fetch(query, { e: String(email || '').trim().toLowerCase() });
}

export async function getVendorOrdersByVendorId(vendorId: string) {
  const query = '*[_type == "vendor" && _id == $vid][0].orders[] { orderId, status, amount, orderDate }';
  return await sanity.fetch(query, { vid: vendorId });
}

export async function getAllOrders() {
  const query = '*[_type == "order"] | order(createdAt desc) { ..., customer->{name, email}, vendor->{name, email} }';
  return await sanity.fetch(query, {});
}
