import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { fetchVendorInventory, updateVendorInventory } from '@/server/vendor-portal/data';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'update_inventory');
  if (!ctx.ok) return ctx.response;
  try {
    const items = await fetchVendorInventory(ctx.vendorId);
    return jsonResponse({ items }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor inventory] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  const ctx = await requireVendor(request, 'update_inventory');
  if (!ctx.ok) return ctx.response;
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    await updateVendorInventory(
      items
        .map((entry) => ({
          _id: String(entry?._id || ''),
          quantityAvailable:
            typeof entry?.quantityAvailable === 'number' ? entry.quantityAvailable : undefined,
          leadTime: typeof entry?.leadTime === 'number' ? entry.leadTime : undefined
        }))
        .filter((item) => item._id)
    );
    return jsonResponse({ ok: true }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor inventory update] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
