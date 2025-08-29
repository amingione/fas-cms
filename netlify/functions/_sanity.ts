import { createClient } from '@sanity/client';
export type SanityClient = ReturnType<typeof createClient>;

// Resolve envs flexibly so functions work in local/dev/prod
const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID;

const dataset =
  process.env.SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  'production';

const apiVersion = process.env.SANITY_API_VERSION || '2023-06-07';

// Prefer write token; fall back to read token; ok to be undefined for public reads
const token =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.VITE_SANITY_API_TOKEN ||
  process.env.SANITY_TOKEN;

if (!projectId) {
  throw new Error(
    'Sanity client misconfigured: missing projectId. Set SANITY_PROJECT_ID (or SANITY_STUDIO_PROJECT_ID or VITE_SANITY_PROJECT_ID).'
  );
}

export const sanity: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: !token // Use CDN for read-only; disable when a token is present
});

export function getSanityClient(
  overrides: Partial<Parameters<typeof createClient>[0]> = {}
): SanityClient {
  return createClient({ projectId, dataset, apiVersion, token, useCdn: !token, ...overrides });
}
