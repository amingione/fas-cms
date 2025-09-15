import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function POST({ request }: { request: Request }) {
  const data = await request.formData();
  const name = (data.get('name') as string) || '';
  const email = (data.get('email') as string) || '';
  const phone = (data.get('phone') as string) || '';
  const message = (data.get('message') as string) || '';
  const honeypot = (data.get('website') as string) || '';
  const returnTo = (data.get('returnTo') as string) || '';

  if (honeypot) {
    return new Response(null, { status: 303, headers: { Location: (returnTo && returnTo.startsWith('/')) ? `${returnTo}?success=true` : '/contact?success=true' } });
  }

  try {
    await resend.emails.send({
      from: 'FAS Motorsports <sales@updates.fasmotorsports.com>',
      to: ['sales@fasmotorsports.com'],
      subject: `New Sales Lead from ${name || 'Unknown'}`,
      replyTo: email || undefined,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111;max-width:640px">
          <h2 style="margin:0 0 8px 0">New Sales Lead</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p style="margin-top:8px"><strong>Message:</strong></p>
          <p>${(message || '').replace(/\n/g, '<br/>')}</p>
        </div>
      `
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: (returnTo && returnTo.startsWith('/')) ? `${returnTo}?success=true` : '/contact?success=true'
      }
    });
  } catch (error) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: (returnTo && returnTo.startsWith('/')) ? `${returnTo}?error=true` : '/contact?error=true'
      }
    });
  }
}

