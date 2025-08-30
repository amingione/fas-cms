import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const json = (data: any, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...init
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, phone, vehicle, items, subtotal, notes } = body || {};
    if (!name || !email || !vehicle || !Array.isArray(items) || items.length === 0) {
      return json({ message: 'Missing required fields' }, { status: 400 });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const toAddress = (import.meta.env.QUOTE_EMAIL_TO as string) || 'sales@fasmotorsports.com';

    const safe = (v: any) => String(v ?? '').toString();
    const currency = (n: any) => {
      const x = Number(n);
      if (!isFinite(x) || x <= 0) return '$0.00';
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(x); }
      catch { return `$${x.toFixed(2)}`; }
    };

    const itemsTable = Array.isArray(items)
      ? items
          .map((it: any) => {
            const price = Number(it?.price) || 0;
            const qty = Number(it?.qty) || 1;
            const total = price * qty;
            return `
              <tr>
                <td style="padding:6px 8px;border:1px solid #eee">${safe(it?.name)}</td>
                <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${qty}</td>
                <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${currency(price)}</td>
                <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${currency(total)}</td>
              </tr>`;
          })
          .join('')
      : '';

    const html = `
      <div>
        <h2>New Build Quote Request</h2>
        <p><strong>Name:</strong> ${safe(name)}</p>
        <p><strong>Email:</strong> ${safe(email)}</p>
        <p><strong>Phone:</strong> ${safe(phone)}</p>
        <p><strong>Vehicle:</strong> ${safe(vehicle)}</p>
        ${notes ? `<p><strong>Notes:</strong><br/>${safe(notes)}</p>` : ''}
        <h3>Items</h3>
        <table style="border-collapse:collapse;border:1px solid #eee">
          <thead>
            <tr>
              <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Item</th>
              <th style="padding:6px 8px;border:1px solid #eee">Qty</th>
              <th style="padding:6px 8px;border:1px solid #eee">Price</th>
              <th style="padding:6px 8px;border:1px solid #eee">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable}
            <tr>
              <td colspan="3" style="padding:6px 8px;border:1px solid #eee;text-align:right"><strong>Subtotal</strong></td>
              <td style="padding:6px 8px;border:1px solid #eee;text-align:right"><strong>${currency(subtotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>`;

    if (!import.meta.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set; skipping email send.');
      return json({ ok: true, message: 'Quote received (email not sent: missing RESEND_API_KEY).' }, { status: 200 });
    }

    try {
      await resend.emails.send({
        from: 'FAS Motorsports <no-reply@fasmotorsports.io>',
        to: [toAddress, safe(email)].filter(Boolean) as string[],
        subject: `Build Quote Request — ${safe(vehicle)}`,
        html
      });
      return json({ ok: true, message: 'Quote sent' }, { status: 200 });
    } catch (sendErr) {
      console.error('Resend send failed:', sendErr);
      return json({ ok: false, message: 'Quote received but email failed to send.' }, { status: 200 });
    }
  } catch (err) {
    console.error('build-quote failed:', err);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });

