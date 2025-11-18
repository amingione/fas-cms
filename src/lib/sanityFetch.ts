import {createClient} from '@sanity/client';

type QueryParams = Record<string, string | number | boolean>;

type SanityFetchOptions = {
  perspective?: 'published' | 'drafts'
  token?: string
  useCdn?: boolean
  stega?: boolean
  tag?: string
}

const projectId =
  (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
  (import.meta.env.SANITY_PROJECT_ID as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_PROJECT_ID as string | undefined) ||
  'r4og35qd';

const dataset =
  (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) ||
  (import.meta.env.SANITY_DATASET as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_DATASET as string | undefined) ||
  'production';

const apiVersion =
  (import.meta.env.PUBLIC_SANITY_API_VERSION as string | undefined) ||
  (import.meta.env.SANITY_API_VERSION as string | undefined) ||
  '2023-06-07';

const studioUrl =
  (import.meta.env.PUBLIC_SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.PUBLIC_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_URL as string | undefined) ||
  (import.meta.env.SANITY_STUDIO_NETLIFY_BASE as string | undefined) ||
  undefined;

const defaultToken =
  (import.meta.env.SANITY_API_READ_TOKEN as string | undefined) ||
  (import.meta.env.SANITY_API_TOKEN as string | undefined) ||
  (import.meta.env.SANITY_WRITE_TOKEN as string | undefined) ||
  undefined;

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
