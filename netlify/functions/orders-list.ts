import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    // Helpful for localhost where the admin runs on a different port
    'access-control-allow-origin': '*'
  },
  body: JSON.stringify(body)
});

export const handler: Handler = async (event) => {
  try {
    const host = event.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    // Auth: allow localhost during dev; prod/staging must be authenticated and authorized
    let user: any = null;
    if (!isLocal) {
      user = requireUser(event); // should throw if invalid/expired
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: string) => (r || '').toLowerCase())
        : [];
      // Align with _auth.ts which allows 'owner' or 'staff'
      const allowed = roles.includes('owner') || roles.includes('staff');
      if (!allowed) return json(403, { error: 'Forbidden' });
    }

    // ---- 1) Try Sanity first (primary source of truth) ----
    // Keep the GROQ tight and return only the fields the UI needs
    const q = `*[_type=="order"]|order(orderDate desc)[0...200]{
      _id,
      orderNumber,
      status,
      // be permissive about numeric/string
      total,
      customerName,
      customerEmail,
      orderDate,
      items[]{ title, qty, price }
    }`;

    let sanityRows: any[] = [];
    try {
      const cached = await sanity.fetch(q);
      if (Array.isArray(cached)) sanityRows = cached;
    } catch (e) {
      // swallow and let Stripe fallback handle empty
    }

    const sanityData = (sanityRows || []).map((o) => ({
      _id: o?._id || '',
      orderNumber: o?.orderNumber || o?._id || '',
      status: o?.status || 'unknown',
      total: typeof o?.total === 'number' ? o.total : Number(o?.total) || 0,
      customerName: o?.customerName || '',
      customerEmail: o?.customerEmail || '',
      orderDate: o?.orderDate || '',
      items: Array.isArray(o?.items)
        ? o.items.map((it: any) => ({
            title: it?.title || '',
            qty: typeof it?.qty === 'number' ? it.qty : Number(it?.qty) || 0,
            price: typeof it?.price === 'number' ? it.price : Number(it?.price) || 0
          }))
        : []
    }));

    if (sanityData.length > 0) {
      return json(200, { source: 'sanity', data: sanityData });
    }

    // ---- 2) Fallback to Stripe PaymentIntents (if configured) ----
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(200, { source: 'empty', data: [] });

    const stripeMod = await import('stripe');
    const Stripe = stripeMod.default;
    // Use a stable recent API version; omit if you want account default
    const stripe = new Stripe(stripeKey /*, { apiVersion: '2024-06-20' } */);

    const pis = await stripe.paymentIntents.list({ limit: 50 });
    const stripeData = pis.data.map((pi: any) => ({
      _id: pi.id,
      orderNumber: pi.id,
      status: pi.status,
      total: (typeof pi.amount === 'number' ? pi.amount : Number(pi.amount) || 0) / 100,
      customerName: (pi.shipping?.name as string) || '',
      customerEmail: (pi.receipt_email as string) || '',
      orderDate: new Date((pi.created as number) * 1000).toISOString(),
      items: [] as any[]
    }));

    return json(200, { source: 'stripe', data: stripeData });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    const message = e?.message || 'Error';
    return json(status, { error: message });
  }
};
