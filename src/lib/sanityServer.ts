import { createClient } from '@sanity/client';

export function getSanityServerClient(overrides: Partial<Parameters<typeof createClient>[0]> = {}) {
  const projectId =
    (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
    (import.meta.env.SANITY_STUDIO_PROJECT_ID as string | undefined);

  const dataset =
    (import.meta.env.SANITY_DATASET as string | undefined) ||
    (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
    (import.meta.env.SANITY_STUDIO_DATASET as string | undefined) ||
    'production';

  const token =
    (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
    (import.meta.env.SANITY_API_READ_TOKEN as string | undefined) ||
    (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
    (import.meta.env.VITE_SANITY_API_TOKEN as string | undefined);

  if (!projectId) {
    throw new Error('Sanity misconfigured: missing projectId');
  }

  return createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2024-01-01',
    useCdn: !token,
    ...overrides
  });
}

export const sanityServer = getSanityServerClient();
