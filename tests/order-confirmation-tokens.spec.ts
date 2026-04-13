import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  issueOrderConfirmationToken,
  verifyOrderConfirmationToken
} from '../src/server/order-confirmation-tokens';

// Mock environment variables
beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-12345';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Order Confirmation Tokens', () => {
  describe('issueOrderConfirmationToken', () => {
    it('should generate a valid JWT token', () => {
      const paymentIntentId = 'pi_test123';

      const token = issueOrderConfirmationToken(paymentIntentId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include orderId in token when provided', () => {
      const paymentIntentId = 'pi_test123';
      const orderId = 'order_test456';

      const token = issueOrderConfirmationToken(paymentIntentId, orderId);
      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.orderId).toBe(orderId);
    });

    it('should omit orderId from token when not provided', () => {
      const paymentIntentId = 'pi_test123';

      const token = issueOrderConfirmationToken(paymentIntentId);
      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.orderId).toBeUndefined();
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;
      delete process.env.ORDER_CONFIRMATION_TOKEN_SECRET;

      expect(() => {
        issueOrderConfirmationToken('pi_test');
      }).toThrow(/No secret configured/);

      // Restore for other tests
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-12345';
    });
  });

  describe('verifyOrderConfirmationToken', () => {
    it('should verify a valid token', () => {
      const paymentIntentId = 'pi_test123';
      const orderId = 'order_test456';

      const token = issueOrderConfirmationToken(paymentIntentId, orderId);
      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.paymentIntentId).toBe(paymentIntentId);
      expect(result.payload?.orderId).toBe(orderId);
      expect(result.payload?.purpose).toBe('order-confirmation');
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid token', () => {
      const result = verifyOrderConfirmationToken('invalid.token.here');

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject a token with wrong signature', () => {
      const paymentIntentId = 'pi_test123';
      const orderId = 'order_test456';

      // Generate token with one secret
      const token = issueOrderConfirmationToken(paymentIntentId, orderId);

      // Change secret and try to verify
      process.env.JWT_SECRET = 'different-secret-key-12345';

      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/signature/i);

      // Restore
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-12345';
    });

    it('should reject an expired token', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const token = issueOrderConfirmationToken('pi_test123');

      // Advance time past the 15-minute expiration window
      vi.setSystemTime(new Date(now.getTime() + 16 * 60 * 1000));

      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    it('should reject a token missing paymentIntentId', () => {
      const secret = process.env.JWT_SECRET!;
      // Manually sign a JWT that is missing the paymentIntentId claim
      const token = jwt.sign(
        { orderId: 'order_test', purpose: 'order-confirmation' },
        secret,
        { algorithm: 'HS256', issuer: 'fas-order-confirmation', expiresIn: '15m' }
      );

      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/paymentIntentId/i);
    });

    it('should include correct purpose in token', () => {
      const token = issueOrderConfirmationToken('pi_test');
      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.purpose).toBe('order-confirmation');
    });
  });

  describe('Token lifecycle', () => {
    it('should create and verify a complete token lifecycle', () => {
      const paymentIntentId = 'pi_1234567890';
      const orderId = 'order_9876543210';

      // Issue token
      const token = issueOrderConfirmationToken(paymentIntentId, orderId);
      expect(token).toBeTruthy();

      // Verify token
      const verification = verifyOrderConfirmationToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.paymentIntentId).toBe(paymentIntentId);
      expect(verification.payload?.orderId).toBe(orderId);

      // Token should be usable for the intended purpose
      expect(verification.payload?.purpose).toBe('order-confirmation');
    });
  });
});
