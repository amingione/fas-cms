import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';

// POST /api/vendor/auth/resend-invite
// Body: { vendorId: string }
// Rate-limited: max 3 resends per vendor per 24h (tracked via Sanity emailLog count)
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ message: 'Invalid JSON' }, { status: 400 });
    }

    const vendorId = String(body.vendorId || '').trim().replace(/^drafts\./, '');
    if (!vendorId) {
      return jsonResponse({ message: 'vendorId is required' }, { status: 400 });
    }

    const hasSanity = Boolean(
      (import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined) ||
        process.env.SANITY_PROJECT_ID,
    );
    if (!hasSanity) {
      return jsonResponse({ message: 'Service unavailable' }, { status: 503 });
    }

    const { sanity } = await import('../../../../server/sanity-client');

    // Verify vendor exists and portal is enabled
    const vendor = await sanity.fetch<{
      _id: string;
      status?: string;
      portalAccess?: {
        enabled?: boolean;
        setupCompletedAt?: string;
        email?: string;
      };
    } | null>(
      `*[_type == "vendor" && _id == $id][0]{
        _id, status,
        portalAccess{ enabled, setupCompletedAt, email }
      }`,
      { id: vendorId },
    );

    if (!vendor) {
      // Return 200 to avoid vendor ID enumeration
      return jsonResponse({ ok: true }, { status: 200 });
    }

    if (vendor.portalAccess?.setupCompletedAt) {
      return jsonResponse(
        { message: 'Account is already set up. Please sign in.' },
        { status: 409 },
      );
    }

    // Rate limit: max 3 invite emails in last 24h for this vendor
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentCount = await sanity.fetch<number>(
      `count(*[_type == "vendorEmailLog"
        && vendor._ref == $vendorId
        && subject match "invite*"
        && sentAt > $since
      ])`,
      { vendorId, since: oneDayAgo },
    );

    if (recentCount >= 3) {
      return jsonResponse(
        { message: 'Too many invite requests. Please try again tomorrow or contact support.' },
        { status: 429 },
      );
    }

    // Call the fas-sanity send-vendor-invite Netlify function
    const sanityFunctionUrl =
      process.env.SANITY_INVITE_FUNCTION_URL ||
      'https://fassanity.fasmotorsports.com/.netlify/functions/send-vendor-invite';

    const inviteRes = await fetch(sanityFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    });

    if (!inviteRes.ok) {
      const err = await inviteRes.json().catch(() => ({}));
      console.error('[resend-invite] Netlify function error', inviteRes.status, err);
      return jsonResponse(
        { message: 'Failed to send invite. Please contact support.' },
        { status: 502 },
      );
    }

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[resend-invite]', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 });
  }
};
