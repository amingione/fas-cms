export default async function cfetch(endpoint: string, options: RequestInit = {}) {
  const base =
    typeof window === 'undefined' ? process.env.PUBLIC_SITE_URL || 'https://fasmotorsports.io' : '';

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include' // Ensures cookies like token are sent
  });

  return res;
}
