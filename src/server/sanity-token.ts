import { getSecret } from './aws-secrets';

/**
 * Returns the Sanity API token, using the AWS SM priority chain:
 *   process.env.SANITY_API_TOKEN → AWS Secrets Manager → import.meta.env fallback
 *
 * Async because AWS SM lookup is async. All callers (API routes, server utilities)
 * are already async so this is a drop-in change.
 */
export async function requireSanityApiToken(context = 'server route'): Promise<string> {
  const token = await getSecret('SANITY_API_TOKEN');
  if (!token) {
    throw new Error(`[sanity] Missing SANITY_API_TOKEN for ${context}`);
  }
  return token;
}
