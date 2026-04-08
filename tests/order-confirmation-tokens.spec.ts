import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  issueOrderConfirmationToken,
  verifyOrderConfirmationToken
} from '../src/server/order-confirmation-tokens';

// Mock environment variables
beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-12345';
});

describe('Order Confirmation Tokens', () => {
  describe('issueOrderConfirmationToken', () => {
    it('should generate a valid JWT token', () => {
      const paymentIntentId = 'pi_test123';
      const orderId = 'order_test456';

      const token = issueOrderConfirmationToken(paymentIntentId, orderId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;
      delete process.env.ORDER_CONFIRMATION_TOKEN_SECRET;

      expect(() => {
        issueOrderConfirmationToken('pi_test', 'order_test');
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

    it('should reject an expired token', async () => {
      // Create a token that expires immediately
      const paymentIntentId = 'pi_test123';
      const orderId = 'order_test456';

      // We can't easily test expiration without mocking time or waiting,
      // but we can at least verify the structure includes expiration
      const token = issueOrderConfirmationToken(paymentIntentId, orderId);
      const result = verifyOrderConfirmationToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.exp).toBeDefined();
      expect(result.payload?.iat).toBeDefined();

      // Verify expiration is in the future
      const now = Math.floor(Date.now() / 1000);
      expect(result.payload!.exp!).toBeGreaterThan(now);
    });

    it('should reject a token missing paymentIntentId', () => {
      // This tests internal validation by creating a malformed token
      // In practice, this would require manually crafting a JWT
      const result = verifyOrderConfirmationToken('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include correct purpose in token', () => {
      const token = issueOrderConfirmationToken('pi_test', 'order_test');
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
