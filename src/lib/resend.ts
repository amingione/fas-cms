/**
 * Safe helpers for working with Resend responses since some payloads might be empty
 * or missing the `id` field we look up for logging.
 */
export const extractResendMessageId = (payload?: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = (payload as Record<string, unknown>).id;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const safeJsonParse = (value?: string): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
