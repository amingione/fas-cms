import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorProducts, updateVendorProducts } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'manage_products');
  if (!ctx.ok) return ctx.response;
  try {
    const products = await fetchVendorProducts(ctx.vendorId);
    return jsonResponse({ products }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor products] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'manage_products');
  if (!ctx.ok) return ctx.response;
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    await updateVendorProducts(
      items
        .map((entry) => ({
          _id: String(entry?._id || ''),
          cost: typeof entry?.cost === 'number' ? entry.cost : undefined,
          active: typeof entry?.active === 'boolean' ? entry.active : undefined
        }))
        .filter((item) => item._id)
    );
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor products update] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
