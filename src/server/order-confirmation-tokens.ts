import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';

/**
 * Order Confirmation Access Tokens
 *
 * These short-lived tokens are issued when an order is created and are required
 * to access PII (email, shipping address) from the order confirmation endpoint.
 *
 * This prevents PII exposure via URL leakage (logs, history, sharing).
 */

const TOKEN_EXPIRY_MINUTES = 15;
const TOKEN_ISSUER = 'fas-order-confirmation';

/**
 * Get the secret key used to sign order confirmation tokens.
 * Falls back through multiple environment variables to ensure compatibility.
 */
function getTokenSecret(): string {
  const secret =
    process.env.ORDER_CONFIRMATION_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('No secret configured for order confirmation tokens (set ORDER_CONFIRMATION_TOKEN_SECRET, JWT_SECRET, or SESSION_SECRET)');
  }

  return secret;
}

/**
 * Generate a short-lived access token for order confirmation.
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @param orderId - Medusa order ID
 * @returns Signed JWT token valid for TOKEN_EXPIRY_MINUTES
 */
export function issueOrderConfirmationToken(paymentIntentId: string, orderId: string): string {
  const secret = getTokenSecret();

  const payload = {
    paymentIntentId,
    orderId,
    purpose: 'order-confirmation'
  };

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: `${TOKEN_EXPIRY_MINUTES}m`,
    issuer: TOKEN_ISSUER,
    subject: paymentIntentId
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Verify and decode an order confirmation token.
 *
 * @param token - JWT token to verify
 * @returns Decoded payload if valid, or error details if invalid
 */
export function verifyOrderConfirmationToken(token: string): {
  valid: boolean;
  payload?: {
    paymentIntentId: string;
    orderId: string;
    purpose: string;
    iat?: number;
    exp?: number;
  };
  error?: string;
} {
  try {
    const secret = getTokenSecret();

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER
    }) as any;

    // Validate required fields
    if (!decoded.paymentIntentId || typeof decoded.paymentIntentId !== 'string') {
      return { valid: false, error: 'Invalid token: missing paymentIntentId' };
    }

    if (!decoded.orderId || typeof decoded.orderId !== 'string') {
      return { valid: false, error: 'Invalid token: missing orderId' };
    }

    if (decoded.purpose !== 'order-confirmation') {
      return { valid: false, error: 'Invalid token: wrong purpose' };
    }

    return {
      valid: true,
      payload: {
        paymentIntentId: decoded.paymentIntentId,
        orderId: decoded.orderId,
        purpose: decoded.purpose,
        iat: decoded.iat,
        exp: decoded.exp
      }
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Invalid token';

    // Provide more specific error messages for common cases
    if (errorMessage.includes('expired')) {
      return { valid: false, error: 'Token has expired' };
    }

    if (errorMessage.includes('invalid signature')) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: false, error: errorMessage };
  }
}

/**
 * Hash a token for storage (if needed for revocation lists).
 * Not currently used, but available for future enhancements.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
