import type { APIRoute } from 'astro';
import { jsonResponse } from '@/server/http/responses';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity, hasWriteToken } from '@/server/sanity-client';
import { rateLimit } from '@/server/vendor-portal/rateLimit';

/**
 * POST /api/vendor/products/submit
 *
 * Creates a vendorProductSubmission document in Sanity.
 * Auth: requires active vendor portal session.
 * Rate-limited: 10 submissions per vendor per 24h.
 */

type SubmitBody = {
  productName?: string;
  brandName?: string;
  sku?: string;
  category?: string;
  description?: string;
  proposedWholesalePrice?: number;
  proposedMsrp?: number;
  minimumOrderQty?: number;
  leadTimeDays?: number;
  fitmentNotes?: string;
  upc?: string;
};

export const POST: APIRoute = async ({ request }) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;

  const { vendorId, email } = ctx;

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const rl = rateLimit(`product-submit:${vendorId}`, {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000
  });
  if (!rl.allowed) {
    return jsonResponse(
      { message: 'Too many product submissions. Please try again tomorrow.' },
      { status: 429 },
      { noIndex: true }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: SubmitBody = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: 'Invalid JSON' }, { status: 400 }, { noIndex: true });
  }

  const productName = String(body.productName || '').trim();
  if (!productName) {
    return jsonResponse({ message: 'productName is required.' }, { status: 400 }, { noIndex: true });
  }

  // ── Sanity write ─────────────────────────────────────────────────────────────
  if (!hasWriteToken) {
    console.error('[vendor/products/submit] SANITY_API_TOKEN not configured — cannot write submission');
    return jsonResponse(
      { message: 'Service unavailable. Please contact support.' },
      { status: 503 },
      { noIndex: true }
    );
  }

  const now = new Date().toISOString();

  try {
    const doc = await sanity.create({
      _type: 'vendorProductSubmission',
      status: 'pending',
      vendor: { _type: 'reference', _ref: vendorId },
      submittedByEmail: email || null,
      productName,
      brandName: body.brandName ? String(body.brandName).trim() : undefined,
      sku: body.sku ? String(body.sku).trim() : undefined,
      category: body.category ? String(body.category).trim() : undefined,
      description: body.description ? String(body.description).trim() : undefined,
      proposedWholesalePrice: typeof body.proposedWholesalePrice === 'number' ? body.proposedWholesalePrice : undefined,
      proposedMsrp: typeof body.proposedMsrp === 'number' ? body.proposedMsrp : undefined,
      minimumOrderQty: typeof body.minimumOrderQty === 'number' ? body.minimumOrderQty : 1,
      leadTimeDays: typeof body.leadTimeDays === 'number' ? body.leadTimeDays : undefined,
      fitmentNotes: body.fitmentNotes ? String(body.fitmentNotes).trim() : undefined,
      upc: body.upc ? String(body.upc).trim() : undefined,
      submittedAt: now,
    });

    return jsonResponse(
      {
        ok: true,
        submissionId: doc._id,
        message: 'Product submitted for review. Our team will follow up within 2–3 business days.',
      },
      { status: 201 },
      { noIndex: true }
    );
  } catch (err) {
    console.error('[vendor/products/submit] Sanity create failed', err);
    return jsonResponse(
      { message: 'Failed to save submission. Please try again.' },
      { status: 500 },
      { noIndex: true }
    );
  }
};
