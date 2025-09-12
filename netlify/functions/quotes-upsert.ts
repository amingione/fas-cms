import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';
import { requireUser } from './_auth';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    await requireUser(event);
    const body = JSON.parse(event.body || '{}');
    const { _id, number, customerName, customerEmail, items = [], status = 'draft' } = body;
    const total = items.reduce(
      (s: any, it: any) => s + Number(it.price || 0) * Number(it.qty || 1),
      0
    );
    // Try to attach a Sanity customer reference by email (create if missing)
    let customerRef: any = undefined;
    if (customerEmail) {
      const email = String(customerEmail).trim().toLowerCase();
      try {
        const existing = await sanity.fetch(
          `*[_type=="customer" && lower(email)==$email][0]{ _id }`,
          { email }
        );
        let cid = existing?._id as string | undefined;
        if (!cid) {
          const created = await sanity.create({ _type: 'customer', name: customerName, email });
          cid = created?._id;
        }
        if (cid) customerRef = { _type: 'reference', _ref: cid };
      } catch {}
    }

    const doc: any = {
      _type: 'quote',
      number,
      customerName,
      customerEmail,
      customer: customerRef,
      items,
      status,
      total
    };
    const res = _id ? await sanity.patch(_id).set(doc).commit() : await sanity.create(doc);
    return { statusCode: 200, body: JSON.stringify(res) };
  } catch (e: any) {
    return { statusCode: e.statusCode || 500, body: e.message || 'Error' };
  }
};
