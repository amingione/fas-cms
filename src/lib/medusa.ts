export const MEDUSA_CART_ID_KEY = 'fas_medusa_cart_id';

type MedusaConfig = {
  baseUrl: string;
  publishableKey?: string;
  regionId?: string;
  fallbackVariantId?: string;
};

export function getMedusaConfig(): MedusaConfig | null {
  const rawBaseUrl =
    (import.meta.env.MEDUSA_BACKEND_URL as string | undefined) ||
    (process.env.MEDUSA_BACKEND_URL as string | undefined) ||
    '';
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) return null;

  const publishableKey =
    (import.meta.env.MEDUSA_PUBLISHABLE_KEY as string | undefined) ||
    (process.env.MEDUSA_PUBLISHABLE_KEY as string | undefined);
  const regionId =
    (import.meta.env.MEDUSA_REGION_ID as string | undefined) ||
    (process.env.MEDUSA_REGION_ID as string | undefined);
  const fallbackVariantId =
    (import.meta.env.MEDUSA_FALLBACK_VARIANT_ID as string | undefined) ||
    (process.env.MEDUSA_FALLBACK_VARIANT_ID as string | undefined);

  return { baseUrl, publishableKey, regionId, fallbackVariantId };
}

export function buildMedusaHeaders(
  publishableKey?: string,
  initHeaders?: HeadersInit
): Headers {
  const headers = new Headers(initHeaders ?? {});
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  if (publishableKey && !headers.has('x-publishable-api-key')) {
    headers.set('x-publishable-api-key', publishableKey);
  }
  return headers;
}

export async function medusaFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const config = getMedusaConfig();
  if (!config) {
    throw new Error('Medusa backend not configured');
  }

  const headers = buildMedusaHeaders(config.publishableKey, init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers
  });
}

export async function readJsonSafe<T = any>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
