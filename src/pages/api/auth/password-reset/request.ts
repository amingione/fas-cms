import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getCustomerByEmail, setCustomerPasswordReset } from '../../../../server/sanity-client';
import { customerPasswordResetRequestSchema } from '@/lib/validators/api-requests';
import { rateLimit } from '@/server/vendor-portal/rateLimit';

const resendApiKey = import.meta.env.RESEND_API_KEY as string | undefined;
const resendFrom =
  (import.meta.env.RESEND_FROM as string | undefined) ||
  'FAS Motorsports <noreply@updates.fasmotorsports.com>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const successMessage = "If an account exists for this email address, we've sent password reset instructions.";
const RESET_TOKEN_LIFETIME_MS = 1000 * 60 * 60;
const RECENT_TOKEN_WINDOW_MS = 5 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyResult = customerPasswordResetRequestSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      console.error('[validation-failure]', {
        schema: 'customerPasswordResetRequestSchema',
        context: 'api/auth/password-reset/request',
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
    const rl = rateLimit(`reset:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ message: successMessage }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return new Response(JSON.stringify({ message: successMessage }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    const existingExpires = (customer as any)?.passwordResetExpires;
    if (existingExpires) {
      const existingExpiryMs = new Date(existingExpires as string).getTime();
      if (!Number.isNaN(existingExpiryMs)) {
        const recentThreshold = Date.now() + (RESET_TOKEN_LIFETIME_MS - RECENT_TOKEN_WINDOW_MS);
        if (existingExpiryMs > recentThreshold) {
          return new Response(JSON.stringify({ message: successMessage }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS).toISOString();

    await setCustomerPasswordReset(customer._id as string, tokenHash, expiresAt);

    const baseUrl =
      (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
      (import.meta.env.PUBLIC_BASE_URL as string | undefined) ||
      new URL(request.url).origin;

    const resetUrl = new URL('/account/reset', baseUrl);
    resetUrl.searchParams.set('token', rawToken);
    resetUrl.searchParams.set('email', email);

    if (!resend) {
      console.error('RESEND_API_KEY missing; cannot send password reset email');
      return new Response(JSON.stringify({ message: 'Email service not configured.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: 'Reset your FAS Motorsports password',
      html: `
        <p>Hello${customer.firstName ? ` ${customer.firstName}` : ''},</p>
        <p>We received a request to reset your password. Click the link below to set a new password. This link is valid for one hour.</p>
        <p><a href="${resetUrl.toString()}">Reset your password</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
        <p>— FAS Motorsports</p>
      `,
      text: `Hello${customer.firstName ? ` ${customer.firstName}` : ''},\n\nWe received a request to reset your password. Use the link below within one hour to set a new password.\n\n${resetUrl.toString()}\n\nIf you didn't request this, you can safely ignore this email.\n\n— FAS Motorsports`
    });

    return new Response(JSON.stringify({ message: successMessage }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    console.error('Customer password reset request failed:', err);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
