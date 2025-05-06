import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, phone, service, datetime, message } = req.body;

  if (!name || !email || !service || !datetime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    await resend.emails.send({
      from: 'FAS Motorsports <no-reply@fasmotorsports.io>',
      to: email,
      subject: `✅ Booking Received: ${service}`,
      html: `
        <h1>Thanks, ${name}!</h1>
        <p>We've received your request for a <strong>${service}</strong> on <strong>${new Date(datetime).toLocaleString()}</strong>.</p>
        <p>We'll be in touch soon to confirm your appointment.</p>
        <hr />
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br />${message || 'N/A'}</p>
      `
    });

    return res.status(200).json({ message: 'Booking submitted' });
  } catch (err) {
    console.error('Booking submission failed:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
