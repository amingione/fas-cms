export default async function cfetch(endpoint: string, options: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fasmotorsports.io';

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)
      ? options.headers
      : {})
  } as Record<string, string>;

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // Support session-based Auth0 auth via cookies
  });

  return res;
}
