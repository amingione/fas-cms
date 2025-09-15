import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityClient } from '@/lib/sanityClient';
import { jtxWheelQuoteSchema } from '@/lib/validators/jtxWheelSpec';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const TO = 'sales@fasmotorsports.com';
const FROM = import.meta.env.RESEND_FROM ?? 'no-reply@fasmotorsports.com';

export const POST: APIRoute = async ({ request }) => {
  try {
    const json = await request.json();
    const data = jtxWheelQuoteSchema.parse(json);

    const doc = {
      _type: 'wheelQuote',
      source: 'jtx',
      pageContext: data.pageContext ?? null,
      createdAt: new Date().toISOString(),
      fullname: data.fullname,
      email: data.email,
      phone: data.phone ?? null,
      vehicleYear: data.vehicleYear ?? null,
      vehicleMake: data.vehicleMake ?? null,
      vehicleModel: data.vehicleModel ?? null,
      series: data.series,
      diameter: data.diameter,
      width: data.width,
      boltPattern: data.boltPattern,
      offset: data.offset,
      finish: data.finish,
      color: data.color ?? null,
      qty: data.qty,
      notes: data.notes ?? null,
      status: 'new'
    };
    await sanityClient.create(doc);

    const subject = `[JTX Quote] ${data.series} ${data.diameter}x${data.width} ${data.boltPattern} — ${data.fullname}`;
    const html = `
      <h2>JTX Quote Request</h2>
      <p><b>Series:</b> ${data.series}</p>
      <p><b>Spec:</b> ${data.diameter}x${data.width} • ${data.boltPattern} • Offset: ${data.offset}</p>
      <p><b>Finish:</b> ${data.finish} ${data.color ? '• <b>Color:</b> '+data.color : ''}</p>
      <p><b>Qty:</b> ${data.qty}</p>
      <p><b>Vehicle:</b> ${data.vehicleYear ?? ''} ${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''}</p>
      <p><b>Customer:</b> ${data.fullname} • ${data.email} ${data.phone ? '• '+data.phone : ''}</p>
      <p><b>Notes:</b><br/>${(data.notes ?? '').replace(/\n/g,'<br/>')}</p>
    `;
    await resend.emails.send({ from: FROM, to: [TO], replyTo: data.email, subject, html });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Invalid payload' }), { status: 400 });
  }
};

