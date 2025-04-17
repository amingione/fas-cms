import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function POST({ request }: { request: Request }) {
  const data = await request.formData();
  const name = data.get('name');
  const email = data.get('email');
  const message = data.get('message');

  try {
    await resend.emails.send({
      from: 'FAS Motorsports <contact@updates.fasmotorsports.com>',
      to: ['support@fasmotorsports.com'],
      subject: `New Contact Form Submission from ${name}`,
      replyTo: email as string,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: '/contact?success=true',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/contact?error=true',
      },
    });
  }
}