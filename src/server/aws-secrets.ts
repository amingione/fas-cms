/**
 * AWS Secrets Manager singleton utility
 *
 * Resolution order for every secret:
 *   1. process.env[key]          — Netlify env var or local .env (fastest, no network)
 *   2. AWS Secrets Manager       — fas/production/secrets JSON blob (one fetch per warm container)
 *   3. import.meta.env[key]      — Astro/Vite build-time fallback (local dev without .env)
 *
 * Secrets that CANNOT use this utility (synchronous module-init constraint):
 *   - SESSION_SECRET / JWT_SECRET  → stay in Netlify env vars; see src/server/auth/session.ts
 *
 * Required Netlify env vars when AWS SM is enabled:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_SECRET_NAME
 */

import type { SecretsManagerClient as SecretsManagerClientType } from '@aws-sdk/client-secrets-manager';

const SECRET_NAME = process.env.AWS_SECRET_NAME || 'fas/production/secrets';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Module-level cache — lives for the lifetime of a warm Lambda container.
// bustSecretsCache() resets both so the next call re-fetches from AWS.
let cachedSecrets: Record<string, string> | null = null;
let clientSingleton: SecretsManagerClientType | null = null;

/** Returns an SM client if AWS credentials are present, otherwise null. */
async function getClient(): Promise<SecretsManagerClientType | null> {
  const keyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  // Skip AWS entirely when credentials are absent (local dev, etc.)
  if (!keyId || !secret) return null;

  if (clientSingleton) return clientSingleton;

  try {
    const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
    clientSingleton = new SecretsManagerClient({ region: AWS_REGION });
    return clientSingleton;
  } catch {
    // Package not installed — graceful degradation to env-only mode
    return null;
  }
}

/**
 * Fetches all secrets from the single JSON blob in AWS Secrets Manager.
 * Cached per warm container invocation.
 */
export async function getAllSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets !== null) return cachedSecrets;

  const smClient = await getClient();
  if (!smClient) {
    cachedSecrets = {};
    return cachedSecrets;
  }

  try {
    const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const response = await smClient.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
    const parsed = JSON.parse(response.SecretString ?? '{}') as Record<string, string>;
    cachedSecrets = parsed;
    return cachedSecrets;
  } catch (err) {
    console.error('[aws-secrets] Failed to load secrets from AWS Secrets Manager:', err);
    cachedSecrets = {};
    return cachedSecrets;
  }
}

/**
 * Resolves a single secret using the priority chain:
 * process.env → AWS SM → import.meta.env
 *
 * Returns undefined if the key is absent from all three sources.
 */
export async function getSecret(key: string): Promise<string | undefined> {
  // 1. Runtime env var (Netlify env / local .env via dotenv-cli)
  const envValue = process.env[key];
  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim();
  }

  // 2. AWS Secrets Manager
  const secrets = await getAllSecrets();
  const smValue = secrets[key];
  if (typeof smValue === 'string' && smValue.trim()) {
    return smValue.trim();
  }

  // 3. Astro/Vite build-time env (local dev fallback)
  const buildValue = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof buildValue === 'string' && buildValue.trim() ? buildValue.trim() : undefined;
}

/**
 * Like getSecret() but throws if the secret is missing.
 * Use in API route handlers — gives a clear error message in logs.
 */
export async function requireSecret(key: string, context = 'server'): Promise<string> {
  const value = await getSecret(key);
  if (!value) {
    throw new Error(`[aws-secrets] Missing required secret "${key}" for ${context}`);
  }
  return value;
}

/**
 * Clears the in-memory cache, forcing a fresh AWS SM fetch on next call.
 * Useful in test environments or after a secret rotation.
 */
export function bustSecretsCache(): void {
  cachedSecrets = null;
  clientSingleton = null;
}
