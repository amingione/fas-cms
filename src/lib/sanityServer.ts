import { createClient } from '@sanity/client';

export function getSanityServerClient(overrides: Partial<Parameters<typeof createClient>[0]> = {}) {
  const serverEnv =
    (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string | undefined>;

  const projectId =
    serverEnv.SANITY_PROJECT_ID ||
    (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined);

  const dataset =
    serverEnv.SANITY_DATASET ||
    (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
    'production';

  const token =
    serverEnv.SANITY_API_TOKEN;

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
