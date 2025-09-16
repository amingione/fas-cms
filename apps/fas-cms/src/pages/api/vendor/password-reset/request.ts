import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getVendorByEmail, setVendorPasswordReset } from '../../../../server/sanity-client';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'FAS Motorsports <no-reply@fasmotorsports.com>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const successMessage = "If an account exists for this email address, we've sent password reset instructions.";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ message: 'Email is required.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const vendor = await getVendorByEmail(email);
    if (!vendor) {
      return new Response(JSON.stringify({ message: successMessage }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    await setVendorPasswordReset(vendor._id, tokenHash, expiresAt);

    const baseUrl = process.env.PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
    const resetUrl = new URL('/vendor/reset', baseUrl);
    resetUrl.searchParams.set('token', rawToken);
    resetUrl.searchParams.set('email', email);

    if (resend) {
      try {
        await resend.emails.send({
          from: resendFrom,
          to: email,
          subject: 'Reset your FAS Motorsports vendor password',
          html: `
            <p>Hello${vendor.name ? ` ${vendor.name}` : ''},</p>
            <p>We received a request to reset the password for your vendor account. Click the link below to set a new password. This link is valid for one hour.</p>
            <p><a href="${resetUrl.toString()}">Reset your password</a></p>
            <p>If you didn't request this, you can ignore this email.</p>
            <p>— FAS Motorsports</p>
          `,
          text: `Hello${vendor.name ? ` ${vendor.name}` : ''},\n\nWe received a request to reset the password for your vendor account. Use the link below within one hour to set a new password.\n\n${resetUrl.toString()}\n\nIf you didn't request this, you can safely ignore this email.\n\n— FAS Motorsports`
        });
      } catch (err) {
        console.error('Failed to send vendor reset email via Resend:', err);
        return new Response(JSON.stringify({ message: 'Unable to send reset email right now. Please try again later.' }), {
          status: 500,
          headers: { 'content-type': 'application/json' }
        });
      }
    } else {
      console.warn('Resend API key missing; password reset email not sent');
      return new Response(JSON.stringify({ message: 'Email service not configured.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: successMessage }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Vendor password reset request failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
