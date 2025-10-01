import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { wheelQuoteSchema } from '@/lib/validators/belakWheelSpec';

const resendApiKey = import.meta.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const TO = 'sales@fasmotorsports.com';
const FROM = import.meta.env.RESEND_FROM ?? 'no-reply@fasmotorsports.com';

const sanityProjectId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const sanityDataset = import.meta.env.SANITY_DATASET || import.meta.env.PUBLIC_SANITY_DATASET;
const sanityToken = import.meta.env.SANITY_API_TOKEN;

const sanity =
  sanityProjectId && sanityDataset && sanityToken
    ? createClient({
        projectId: sanityProjectId,
        dataset: sanityDataset,
        apiVersion: '2025-09-10',
        token: sanityToken,
        useCdn: false
      })
    : null;

export const POST: APIRoute = async ({ request }) => {
  try {
    const json = await request.json();
    const data = wheelQuoteSchema.parse(json);

    const doc = {
      _type: 'wheelQuote',
      source: 'belak',
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
      agreeTrackUseOnly: data.agreeTrackUseOnly ?? false,
      attachments: (data.attachmentAssetIds ?? []).map((id: string) => ({
        _type: 'reference',
        _ref: id
      })),
      status: 'new'
    };

    let createdId: string | null = null;
    if (sanity) {
      try {
        const created = await sanity.create(doc);
        createdId = created?._id ?? null;
      } catch (err) {
        console.error('[Belak Quote] Failed to persist to Sanity', err);
      }
    } else {
      console.warn('[Belak Quote] Sanity credentials missing. Skipping persistence.');
    }

    const subject = `[Belak Quote] ${data.series} ${data.diameter}x${data.width}\" ${data.boltPattern} — ${data.fullname}`;
    const html = `
      <h2>Belak Quote Request</h2>
      <p><b>Sanity Doc ID:</b> ${createdId ?? 'n/a'}</p>
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

    if (resend) {
      try {
        await resend.emails.send({
          from: FROM,
          to: [TO],
          replyTo: data.email,
          subject,
          html
        });
      } catch (err) {
        console.error('[Belak Quote] Failed to send Resend email', err);
      }
    } else {
      console.warn('[Belak Quote] Resend API key missing. Skipping email notification.');
    }

    return new Response(JSON.stringify({ ok: true, id: createdId }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Invalid payload' }), {
      status: 400
    });
  }
};
