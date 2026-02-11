export function requireSanityApiToken(context = 'server route'): string {
  const runtime = process.env.SANITY_API_TOKEN;
  if (typeof runtime === 'string' && runtime.trim()) {
    return runtime.trim();
  }

  const buildTime = (import.meta.env as Record<string, string | undefined>).SANITY_API_TOKEN;
  const fallbackPublic = (import.meta.env as Record<string, string | undefined>).PUBLIC_SANITY_API_TOKEN;
  const token = (buildTime || fallbackPublic || '').trim();
  if (!token) {
    throw new Error(`[sanity] Missing SANITY_API_TOKEN for ${context}`);
  }
  return token;
}
