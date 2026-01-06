import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getVendorByEmail, setVendorPasswordReset } from '../../../../server/sanity-client';
import { vendorPasswordResetRequestSchema } from '@/lib/validators/api-requests';

const resendApiKey = import.meta.env.RESEND_API_KEY as string | undefined;
const resendFrom =
  (import.meta.env.RESEND_FROM as string | undefined) ||
  'FAS Motorsports <noreply@updates.fasmotorsports.com>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const successMessage = "If an account exists for this email address, we've sent password reset instructions.";

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = vendorPasswordResetRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'vendorPasswordResetRequestSchema',
        context: 'api/vendor/password-reset/request',
        identifier: 'unknown',
        timestamp: new Date().toISOString(),
        errors: bodyResult.error.format()
      });
      return new Response(
        JSON.stringify({ message: 'Validation failed', details: bodyResult.error.format() }),
        { status: 422, headers: { 'content-type': 'application/json' } }
      );
    }
    const email = String(bodyResult.data.email || '').trim().toLowerCase();

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

    const baseUrl =
      (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
      (import.meta.env.PUBLIC_BASE_URL as string | undefined) ||
      new URL(request.url).origin;

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
