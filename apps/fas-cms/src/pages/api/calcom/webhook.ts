import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const CALCOM_WEBHOOK_SECRET = import.meta.env.CALCOM_WEBHOOK_SECRET;
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const signature = req.headers['x-cal-signature'] as string;

  if (!CALCOM_WEBHOOK_SECRET || signature !== CALCOM_WEBHOOK_SECRET) {
    return res.status(403).json({ message: 'Forbidden - Invalid signature' });
  }

  try {
    const event = req.body;

    console.log('📥 Cal.com Webhook received:', event);

    if (event.type === 'booking.created') {
      const booking = event.payload;

      try {
        await resend.emails.send({
          from: 'FAS Motorsports <no-reply@fasmotorsports.io>',
          to: booking.customer.email,
          subject: `✅ Appointment Confirmed: ${booking.eventType.title}`,
          html: `
            <h1>Thank you for booking with FAS Motorsports</h1>
            <p>Your appointment for <strong>${booking.eventType.title}</strong> has been confirmed.</p>
            <p><strong>Time:</strong> ${new Date(booking.startTime).toLocaleString()}</p>
            <p>If you need to make changes, you can <a href="${booking.rescheduleUrl}">reschedule</a> or <a href="${booking.cancelUrl}">cancel</a>.</p>
          `
        });

        console.log('✅ Confirmation email sent to', booking.customer.email);
      } catch (emailError) {
        console.error('❌ Failed to send booking email:', emailError);
      }
    }

    res.status(200).json({ message: 'Event received' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
