export const MEDUSA_CART_ID_KEY = 'fas_medusa_cart_id';

type MedusaConfig = {
  baseUrl: string;
  publishableKey?: string;
  regionId?: string;
};

export function getMedusaConfig(): MedusaConfig | null {
  // In browser: use import.meta.env (Vite/Astro)
  // In Node: use process.env (but check if it exists)
  const isBrowser = typeof window !== 'undefined';
  
  const rawBaseUrl = isBrowser
    ? (import.meta.env.PUBLIC_MEDUSA_BACKEND_URL as string | undefined) || ''
    : (typeof process !== 'undefined' && process.env?.MEDUSA_BACKEND_URL) || 
      (import.meta.env.MEDUSA_BACKEND_URL as string | undefined) || '';
  
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  if (!baseUrl) return null;

  const publishableKey = isBrowser
    ? (import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY as string | undefined)
    : (typeof process !== 'undefined' && process.env?.MEDUSA_PUBLISHABLE_KEY) ||
      (import.meta.env.MEDUSA_PUBLISHABLE_KEY as string | undefined);
      
  const regionId = isBrowser
    ? (import.meta.env.PUBLIC_MEDUSA_REGION_ID as string | undefined)
    : (typeof process !== 'undefined' && process.env?.MEDUSA_REGION_ID) ||
      (import.meta.env.MEDUSA_REGION_ID as string | undefined);
      
  return { baseUrl, publishableKey, regionId };
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

  if (!/^https?:\/\//i.test(config.baseUrl)) {
    throw new Error(
      `Invalid Medusa base URL "${config.baseUrl}". Expected an absolute URL starting with http:// or https://`
    );
  }

  const headers = buildMedusaHeaders(config.publishableKey, init.headers);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, config.baseUrl).toString();
  const method = (init.method ?? 'GET').toUpperCase();

  try {
    return await fetch(url, {
      ...init,
      headers
    });
  } catch (error) {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const crossOrigin =
      typeof window !== 'undefined' ? new URL(url).origin !== window.location.origin : undefined;

    console.error('[Medusa] fetch() failed', {
      url,
      method,
      origin,
      crossOrigin,
      baseUrl: config.baseUrl
    });

    const hint =
      crossOrigin === true
        ? `This looks like a cross-origin request from "${origin}". If you're running Medusa locally, ensure its STORE_CORS includes your frontend origin.`
        : 'Check that the Medusa server is running and reachable from the browser.';

    const wrapped = new Error(`Failed to fetch Medusa API: ${url}. ${hint}`);
    (wrapped as any).cause = error;
    throw wrapped;
  }
}

export async function readJsonSafe<T = any>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
