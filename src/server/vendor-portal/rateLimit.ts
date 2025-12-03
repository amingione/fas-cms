type WindowConfig = { limit: number; windowMs: number };

const buckets = new Map<string, { count: number; expiresAt: number }>();

function keyFor(id: string, windowMs: number) {
  return `${id}:${windowMs}`;
}

export function rateLimit(id: string, config: WindowConfig) {
  const now = Date.now();
  const bucketKey = keyFor(id, config.windowMs);
  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.expiresAt < now) {
    buckets.set(bucketKey, { count: 1, expiresAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1 };
  }
  if (bucket.count >= config.limit) {
    return { allowed: false, remaining: 0, retryAfter: bucket.expiresAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: config.limit - bucket.count };
}
