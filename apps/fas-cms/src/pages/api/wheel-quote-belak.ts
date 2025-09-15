import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { z } from 'zod';

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const TO = 'sales@fasmotorsports.com';
const FROM = import.meta.env.RESEND_FROM ?? 'no-reply@fasmotorsports.com';

const sanity = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET,
  apiVersion: '2025-09-10',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

export const wheelQuoteSchema = z.object({
  series: z.enum(['Series 2', 'Series 3']),
  fullname: z.string(),
  email: z.string(),
  diameter: z.number(),
  width: z.number(),
  boltPattern: z.enum([
    '4x100',
    '4x108',
    '4x114.3',
    '5x100',
    '5x112',
    '5x114.3',
    '5x120',
    '5x4.50',
    '5x4.75',
    '6x4.5'
  ]),
  backspacing: z.number(),
  finish: z.string(),
  beadlock: z.boolean(),
  hardware: z.string(),
  centerCap: z.string(),
  style: z.string().optional(),
  qtyFront: z.number(),
  qtyRear: z.number(),
  tireSizeFront: z.string().optional(),
  tireSizeRear: z.string().optional(),
  brakeClearanceNotes: z.string().optional(),
  notes: z.string().optional(),
  attachmentAssetIds: z.array(z.string()).optional(),
  pageContext: z.string().optional(),
  phone: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  agreeTrackUseOnly: z.boolean().optional()
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const json = await request.json();
    const data = wheelQuoteSchema.parse(json);

    // 1) Save to Sanity
    const doc = {
      _type: 'wheelQuote',
      source: 'belak',
      pageContext: data.pageContext ?? null,
      createdAt: new Date().toISOString(),
      // customer
      fullname: data.fullname,
      email: data.email,
      phone: data.phone ?? null,
      // vehicle
      vehicleYear: data.vehicleYear ?? null,
      vehicleMake: data.vehicleMake ?? null,
      vehicleModel: data.vehicleModel ?? null,
      // wheel
      series: data.series,
      diameter: data.diameter,
      width: data.width,
      boltPattern: data.boltPattern,
      backspacing: data.backspacing,
      finish: data.finish,
      beadlock: data.beadlock,
      hardware: data.hardware,
      centerCap: data.centerCap,
      style: data.style ?? null,
      qtyFront: data.qtyFront,
      qtyRear: data.qtyRear,
      tireSizeFront: data.tireSizeFront ?? null,
      tireSizeRear: data.tireSizeRear ?? null,
      brakeClearanceNotes: data.brakeClearanceNotes ?? null,
      notes: data.notes ?? null,
      agreeTrackUseOnly: data.agreeTrackUseOnly,
      attachments: (data.attachmentAssetIds ?? []).map((id: string) => ({
        _type: 'reference',
        _ref: id
      })),
      status: 'new'
    };

    const created = await sanity.create(doc);

    // 2) Email to sales
    const subject = `[Belak Quote] ${data.series} ${data.diameter}x${data.width}\" ${data.boltPattern} — ${data.fullname}`;
    const html = `
      <h2>Belak Quote Request</h2>
      <p><b>Sanity Doc ID:</b> ${created._id}</p>
      <p><b>Page:</b> ${data.pageContext ?? '-'}</p>
      <p><b>Series:</b> ${data.series}</p>
      <p><b>Spec:</b> ${data.diameter}" x ${data.width}" • ${data.boltPattern} • Backspacing: ${data.backspacing}</p>
      <p><b>Finish:</b> ${data.finish} • <b>Beadlock:</b> ${data.beadlock} • <b>Hardware:</b> ${data.hardware} • <b>Cap:</b> ${data.centerCap} • <b>Style:</b> ${data.style ?? '-'}</p>
      <p><b>Quantities:</b> Front ${data.qtyFront} • Rear ${data.qtyRear}</p>
      <p><b>Tires:</b> F ${data.tireSizeFront ?? '-'} • R ${data.tireSizeRear ?? '-'}</p>
      <p><b>Vehicle:</b> ${data.vehicleYear ?? ''} ${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''}</p>
      <p><b>Brake clearance notes:</b> ${data.brakeClearanceNotes ?? '-'}</p>
      <p><b>Customer:</b> ${data.fullname} • ${data.email} ${data.phone ? '• ' + data.phone : ''}</p>
      <p><b>Notes:</b><br/>${(data.notes ?? '').replace(/\n/g, '<br/>')}</p>
      <hr/>
      <p><i>Track use only acknowledged by customer.</i></p>
    `;

    await resend.emails.send({
      from: FROM,
      to: [TO],
      replyTo: data.email,
      subject,
      html
    });

    return new Response(JSON.stringify({ ok: true, id: created._id }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Invalid payload' }), {
      status: 400
    });
  }
};
