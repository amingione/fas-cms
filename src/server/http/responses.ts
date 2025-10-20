export interface JsonResponseOptions {
  /** When true, adds bot-blocking headers so crawlers ignore the response. */
  noIndex?: boolean;
  /** Explicit cache-control header to apply when noIndex is true. */
  cacheControl?: string;
}

function applyNoIndexHeaders(headers: Headers, cacheControl?: string) {
  if (!headers.has('cache-control')) {
    headers.set('cache-control', cacheControl ?? 'no-store, max-age=0, must-revalidate');
  }
  headers.set('x-robots-tag', 'noindex, nofollow');
}

export function withNoIndexHeaders(
  base?: HeadersInit,
  { cacheControl }: { cacheControl?: string } = {}
): Headers {
  const headers = new Headers(base ?? {});
  applyNoIndexHeaders(headers, cacheControl);
  return headers;
}

export function jsonResponse(
  data: unknown,
  init: ResponseInit = {},
  options: JsonResponseOptions = {}
): Response {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (options.noIndex) {
    applyNoIndexHeaders(headers, options.cacheControl);
  }
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function unauthorizedJson(
  data: unknown = { message: 'Unauthorized' },
  init: ResponseInit = {},
  options: JsonResponseOptions = {}
): Response {
  return jsonResponse(data, { status: 401, ...init }, { ...options, noIndex: true });
}
