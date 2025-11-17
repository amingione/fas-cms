import 'dotenv/config';
import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    // Helpful for local testing from different ports
    'access-control-allow-origin': '*'
  },
  body: JSON.stringify(body)
});

export const handler: Handler = async (event) => {
  try {
    const host = event.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    // In local dev, allow reading products without auth so the UI can render
    // In prod, require an authenticated user with the proper role
    let user: any = null;
    if (!isLocal) {
      const { requireUser } = await import('./_auth');
      user = await requireUser(event); // throws on failure
      const roles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r: string) => (r || '').toLowerCase())
        : [];
      const allowed = roles.includes('employee') || roles.includes('owner');
      if (!allowed) return json(403, { error: 'Forbidden' });
    }

    const q = `*[_type=="product" && (status == "active" || !defined(status))]|order(title asc)[0...500]{
  _id,
  title,
  sku,
  // coerce to number later; keep raw for now
  price,
  featured,
  draft,
  // deref category names (support either field name)
  "categoryNames": select(
    defined(categories) => categories[]->title,
    defined(category) => category[]->title,
    []
  ),
  // pick a usable image URL (try images[], then image, then socialImage)
  "imageUrl": coalesce(images[0].asset->url, image.asset->url, socialImage.asset->url, "")
}`;

    const rows: any[] = await sanity.fetch(q);

    const data = (rows || []).map((r) => ({
      _id: r?._id || '',
      title: r?.title || '',
      sku: r?.sku || '',
      price: typeof r?.price === 'number' ? r.price : Number(r?.price) || 0,
      featured: !!r?.featured,
      imageUrl: r?.imageUrl || undefined,
      categoryNames: Array.isArray(r?.categoryNames) ? r.categoryNames : []
    }));

    return json(200, data);
  } catch (e: any) {
    const status = e?.statusCode || 500;
    const msg = e?.message || 'Error';
    const isDev = process.env.NODE_ENV !== 'production';
    const body = isDev ? { error: msg, name: e?.name, stack: e?.stack } : { error: msg };
    return json(status, body);
  }
};
