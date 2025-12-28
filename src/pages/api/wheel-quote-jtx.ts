import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@sanity/client';
import { jtxWheelQuoteSchema } from '@/lib/validators/jtxWheelSpec';
import { createQuoteRequest } from '@/server/sanity/quote-requests';

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
        apiVersion: '2024-01-01',
        useCdn: false,
        token: sanityToken
      })
    : null;

export const POST: APIRoute = async ({ request }) => {
  try {
    const json = await request.json();
    const dataResult = jtxWheelQuoteSchema.safeParse(json);
    if (!dataResult.success) {
      console.error('[validation-failure]', {
        schema: 'jtxWheelQuoteSchema',
        context: 'api/wheel-quote-jtx',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: dataResult.error.format()
      });
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: dataResult.error.format() }),
        { status: 422 }
      );
    }
    const data = dataResult.data;

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
    let createdId: string | null = null;
    if (sanity) {
      try {
        const created = await sanity.create(doc);
        createdId = created?._id ?? null;
      } catch (err) {
        console.error('[JTX Quote] Failed to persist to Sanity', err);
      }
    } else {
      console.warn('[JTX Quote] Sanity credentials missing. Skipping persistence.');
    }

    let quoteRequestId: string | null = null;
    try {
      const specLabel = `${data.series} ${data.diameter}x${data.width} ${data.boltPattern} (Offset ${data.offset})`;
      const vehicle = [data.vehicleYear, data.vehicleMake, data.vehicleModel]
        .map((val) => (val || '').trim())
        .filter(Boolean)
        .join(' ');
      const created = await createQuoteRequest({
        source: 'jtx-wheel-quote',
        linkedQuoteId: createdId ?? undefined,
        customerName: data.fullname,
        customerEmail: data.email,
        customerPhone: data.phone,
        vehicle: vehicle || undefined,
        summary: specLabel,
        notes: data.notes,
        items: [
          {
            name: specLabel,
            quantity: Number(data.qty) || undefined,
            notes: `Finish: ${data.finish}${data.color ? ` • Color: ${data.color}` : ''}`
          }
        ],
        meta: { ...data }
      });
      quoteRequestId = created?._id ?? null;
    } catch (err) {
      console.error('[JTX Quote] Failed to log quote request', err);
    }

    const subject = `[JTX Quote] ${data.series} ${data.diameter}x${data.width} ${data.boltPattern} — ${data.fullname}`;
    const html = `
      <h2>JTX Quote Request</h2>
      <p><b>Wheel Quote Doc ID:</b> ${createdId ?? 'n/a'}</p>
      <p><b>Quote Request ID:</b> ${quoteRequestId ?? 'n/a'}</p>
      <p><b>Series:</b> ${data.series}</p>
      <p><b>Spec:</b> ${data.diameter}x${data.width} • ${data.boltPattern} • Offset: ${data.offset}</p>
      <p><b>Finish:</b> ${data.finish} ${data.color ? '• <b>Color:</b> '+data.color : ''}</p>
      <p><b>Qty:</b> ${data.qty}</p>
      <p><b>Vehicle:</b> ${data.vehicleYear ?? ''} ${data.vehicleMake ?? ''} ${data.vehicleModel ?? ''}</p>
      <p><b>Customer:</b> ${data.fullname} • ${data.email} ${data.phone ? '• '+data.phone : ''}</p>
      <p><b>Notes:</b><br/>${(data.notes ?? '').replace(/\n/g,'<br/>')}</p>
    `;
    if (resend) {
      try {
        await resend.emails.send({ from: FROM, to: [TO], replyTo: data.email, subject, html });

        const quoteId = createdId || '';
        const quoteNumber = createdId || '';

        // Create email log
        await sanity
          ?.create({
            _type: 'emailLog',
            to: data.email,
            subject: `Wheel Quote - ${quoteNumber}`,
            status: 'sent',
            sentAt: new Date().toISOString(),
            emailType: 'quote',
            relatedQuote: {
              _type: 'reference',
              _ref: quoteId
            }
          })
          .catch((err) => console.error('Failed to log email:', err));
      } catch (err) {
        console.error('[JTX Quote] Failed to send Resend email', err);
      }
    } else {
      console.warn('[JTX Quote] Resend API key missing. Skipping email notification.');
    }

    return new Response(JSON.stringify({ ok: true, id: createdId, quoteRequestId }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Invalid payload' }), { status: 400 });
  }
};
