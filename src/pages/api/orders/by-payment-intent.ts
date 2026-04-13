import type { APIRoute } from 'astro';
import { getSecret } from '@/server/aws-secrets';
import { verifyOrderConfirmationToken } from '@/server/order-confirmation-tokens';
import { rateLimit } from '@/server/vendor-portal/rateLimit';

/**
 * Look up a Medusa order by Stripe PaymentIntent ID
 *
 * GET /api/orders/by-payment-intent?id=pi_xxx&token=xxx
 *
 * This endpoint is used by the order confirmation page to display the order number
 * and order details. It polls Medusa admin API searching for an order with a payment
 * session/intent matching the ID.
 *
 * Architecture: Medusa is the sole source of truth for order data.
 * All order details (total, email, shipping address) are sourced from Medusa,
 * never directly from Stripe.
 *
 * Security: Requires a short-lived JWT token issued when the order is created.
 * This prevents PII exposure via URL leakage (logs, history, sharing).
 * Rate limiting is applied as defense in depth.
 *
 * Returns:
 *   {
 *     orderId: string,
 *     displayId: number | null,
 *     total: number | null,           // order total in cents when present
 *     shippingTotal: number | null,   // shipping total in cents when present
 *     email: string | null,
 *     shippingAddress: { name, line1, line2, city, state, postalCode, country } | null
 *   } on success
 *   401 if token is missing or invalid
 *   404 if order not found after retries
 *   429 if rate limit exceeded
 *   400 if id query parameter missing (?id=pi_xxx)
 */

export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  const paymentIntentId = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'Missing "id" parameter (Stripe PaymentIntent ID)' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing "token" parameter (access token required)' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Verify the access token
  const tokenVerification = verifyOrderConfirmationToken(token);
  if (!tokenVerification.valid) {
    return new Response(
      JSON.stringify({ error: tokenVerification.error || 'Invalid access token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Ensure the token's payment intent ID matches the requested one
  if (tokenVerification.payload?.paymentIntentId !== paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'Token does not match payment intent ID' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Apply rate limiting (10 requests per minute per client).
  // Use only trusted runtime-provided clientAddress for IP-based limiting.
  // If it is unavailable, fall back to the validated payment intent ID rather than
  // trusting a user-controlled forwarding header such as x-forwarded-for.
  const rateLimitKey = clientAddress || `payment-intent:${paymentIntentId}`;
  const rateLimitResult = rateLimit(rateLimitKey, { limit: 10, windowMs: 60_000 });

  if (!rateLimitResult.allowed) {
    const retryAfterSeconds = Math.ceil((rateLimitResult.retryAfter || 60_000) / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  // Get Medusa config
  const medusaBackendUrl =
    typeof process !== 'undefined' && process.env?.MEDUSA_BACKEND_URL
      ? process.env.MEDUSA_BACKEND_URL
      : (import.meta.env.MEDUSA_BACKEND_URL as string | undefined) || '';

  if (!medusaBackendUrl) {
    console.error('[by-payment-intent] MEDUSA_BACKEND_URL not configured');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let adminToken: string | undefined;
  try {
    adminToken = await getSecret('MEDUSA_ADMIN_API_TOKEN');
  } catch (err) {
    console.error('[by-payment-intent] Failed to get admin token:', err);
  }

  const medusaSecretKey =
    (typeof process !== 'undefined' && process.env?.MEDUSA_SECRET_KEY) ||
    (import.meta.env.MEDUSA_SECRET_KEY as string | undefined) ||
    '';
  const medusaPublishableKey =
    (typeof process !== 'undefined' && process.env?.MEDUSA_PUBLISHABLE_KEY) ||
    (import.meta.env.MEDUSA_PUBLISHABLE_KEY as string | undefined) ||
    '';

  const authHeader = adminToken?.trim()
    ? `Bearer ${adminToken.trim()}`
    : medusaSecretKey.trim()
      ? `Basic ${Buffer.from(`${medusaSecretKey.trim()}:`).toString('base64')}`
      : '';

  if (!authHeader) {
    console.error('[by-payment-intent] No Medusa admin auth configured (MEDUSA_ADMIN_API_TOKEN or MEDUSA_SECRET_KEY)');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  /** Resolve a display name from Medusa shipping address fields. */
  function formatShippingName(sa: Record<string, any>): string | null {
    const parts = [sa.first_name, sa.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : (sa.name as string | undefined) || null;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const pageSize = 100;
      let offset = 0;
      let scanned = 0;
      let totalCount = Number.POSITIVE_INFINITY;

      while (offset < totalCount && scanned < 3000) {
        const response = await fetch(
          `${medusaBackendUrl}/admin/orders?limit=${pageSize}&offset=${offset}&fields=+total,+shipping_total,+email,+shipping_address`,
          {
            method: 'GET',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              ...(medusaPublishableKey.trim()
                ? { 'x-publishable-api-key': medusaPublishableKey.trim() }
                : {}),
            }
          }
        );

        if (!response.ok) {
          console.warn(
            `[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES}: Medusa admin API returned ${response.status}`
          );
          break;
        }

        const data = (await response.json()) as any;
        const orders = Array.isArray(data.orders) ? data.orders : [];
        totalCount = Number.isFinite(Number(data?.count)) ? Number(data.count) : totalCount;
        scanned += orders.length;

        // Search for order with matching payment intent in payment sessions or metadata
        for (const order of orders) {
          let matched = false;

          // Check payment sessions (Medusa's standard location)
          if (Array.isArray(order.payment_sessions)) {
            for (const session of order.payment_sessions) {
              if (
                session?.data?.id === paymentIntentId ||
                session?.data?.payment_intent_id === paymentIntentId ||
                session?.data?.payment_intent === paymentIntentId
              ) {
                matched = true;
                break;
              }
            }
          }

          // Also check metadata in case the PI ID was stored there
          if (!matched && order?.metadata && typeof order.metadata === 'object') {
            const meta = order.metadata as Record<string, any>;
            if (
              meta.stripe_payment_intent_id === paymentIntentId ||
              meta.payment_intent_id === paymentIntentId
            ) {
              matched = true;
            }
          }

          if (matched) {
            // Extract shipping address from Medusa order (source of truth — never from Stripe)
            const sa = order.shipping_address ?? null;
            const shippingAddress = sa
              ? {
                  name: formatShippingName(sa) ?? null,
                  line1: sa.address_1 || null,
                  line2: sa.address_2 || null,
                  city: sa.city || null,
                  state: sa.province || null,
                  postalCode: sa.postal_code || null,
                  country: sa.country_code || null
                }
              : null;

            return new Response(
              JSON.stringify({
                orderId: order.id,
                displayId: order.display_id,
                total: typeof order.total === 'number' ? order.total : null,
                shippingTotal:
                  typeof order.shipping_total === 'number' ? order.shipping_total : null,
                email: order.email ?? null,
                shippingAddress
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Remaining': String(rateLimitResult.remaining)
                }
              }
            );
          }
        }

        if (!orders.length) {
          break;
        }

        offset += pageSize;
      }

      // Order not found in this batch; if we haven't retried yet, wait and try again
      if (attempt < MAX_RETRIES) {
        console.debug(
          `[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES}: Order not found, retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    } catch (error) {
      console.error(`[by-payment-intent] Attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // Order not found after all retries
  return new Response(JSON.stringify({ error: 'Order not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};
