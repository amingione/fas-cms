import {createClient} from '@sanity/client';

type QueryParams = Record<string, string | number | boolean>;

type SanityFetchOptions = {
  perspective?: 'published' | 'drafts'
  token?: string
  useCdn?: boolean
  stega?: boolean
  tag?: string
}

const serverEnv =
  (typeof process !== 'undefined' ? (process as any).env : {}) as Record<string, string | undefined>;
const isServer = Boolean(import.meta.env.SSR);

const publicProjectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined;
const serverProjectId = serverEnv.SANITY_PROJECT_ID;
const projectId = (isServer ? serverProjectId || publicProjectId : publicProjectId) || 'r4og35qd';

const publicDataset = import.meta.env.PUBLIC_SANITY_DATASET as string | undefined;
const serverDataset = serverEnv.SANITY_DATASET;
const dataset = (isServer ? serverDataset || publicDataset : publicDataset) || 'production';

const apiVersion =
  (import.meta.env.PUBLIC_SANITY_API_VERSION as string | undefined) ||
  serverEnv.SANITY_API_VERSION ||
  '2024-01-01';

const studioUrl =
  (import.meta.env.PUBLIC_SANITY_STUDIO_URL as string | undefined) ||
  serverEnv.SANITY_STUDIO_URL ||
  undefined;

const defaultToken = isServer ? serverEnv.SANITY_API_TOKEN : undefined;

const baseClient = createClient({projectId, dataset, apiVersion, useCdn: true});

export async function sanityFetch<T>(
  params: {query: string; params?: QueryParams},
  options: SanityFetchOptions = {},
): Promise<T> {
  const token = options.token ?? defaultToken;
  const perspective = options.perspective ?? (token ? 'drafts' : 'published');
  const useCdn = options.useCdn ?? perspective !== 'drafts';
  const stegaEnabled = options.stega ?? false;

  const clientConfig: Record<string, unknown> = {useCdn, perspective};
  if (token) {
    clientConfig.token = token;
  }

  const client = baseClient.withConfig(clientConfig);

  const fetchOptions: Record<string, unknown> = {};
  if (options.tag) {
    fetchOptions.tag = options.tag;
  }
  if (perspective === 'drafts') {
    fetchOptions.resultSourceMap = 'withKeyArraySelector';
  }
  if (stegaEnabled) {
    fetchOptions.stega = studioUrl
      ? {enabled: true, studioUrl}
      : true;
  }

  return client.fetch<T>(params.query, params.params ?? {}, fetchOptions as any);
}
