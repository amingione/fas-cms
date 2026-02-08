export function requireSanityApiToken(context = 'server route'): string {
  const token = process.env.SANITY_API_TOKEN;
  if (!token) {
    throw new Error(`[sanity] Missing SANITY_API_TOKEN for ${context}`);
  }
  return token;
}
