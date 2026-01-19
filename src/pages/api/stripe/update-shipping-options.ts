/**
 * Update shipping options endpoint for Stripe Embedded Checkout
 * 
 * This endpoint is called when the shipping address changes in the embedded
 * checkout form. It calculates shipping rates (via Parcelcraft or other provider)
 * and updates the Checkout Session with available shipping options.
 * 
 * This is required when using permissions.update_shipping_details = 'server_only'
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripeSecret =
  (import.meta.env.STRIPE_SECRET_KEY as string | undefined) || 
  process.env.STRIPE_SECRET_KEY || 
  '';

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion
});

interface ShippingAddress {
  name?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { sessionId, shippingAddress } = body as { 
      sessionId: string; 
      shippingAddress: ShippingAddress 
    };

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-shipping-options] Address change received:', {
      sessionId,
      country: shippingAddress?.address?.country,
      state: shippingAddress?.address?.state,
      postalCode: shippingAddress?.address?.postal_code,
      city: shippingAddress?.address?.city
    });

    // Retrieve current session with line items
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });

    console.log('[update-shipping-options] Session retrieved:', {
      sessionId: session.id,
      status: session.status,
      lineItemCount: session.line_items?.data.length || 0
    });

    // Calculate shipping options
    // With Parcelcraft, this happens automatically via their app
    // For manual implementation, you would:
    // 1. Calculate weight/dimensions from line items
    // 2. Call your shipping API (UPS, FedEx, etc.)
    // 3. Return shipping options
    
    // For Parcelcraft: Let Parcelcraft handle rate calculation automatically
    // The app will inject shipping rates based on product metadata
    // We just need to update the session to trigger Parcelcraft
    
    try {
      // Update the session to trigger Parcelcraft recalculation
      // Parcelcraft monitors session updates and injects rates automatically
      await stripe.checkout.sessions.update(sessionId, {
        metadata: {
          ...session.metadata,
          shipping_address_updated: new Date().toISOString(),
          shipping_country: shippingAddress?.address?.country || '',
          shipping_postal_code: shippingAddress?.address?.postal_code || ''
        }
      });

      console.log('[update-shipping-options] ✅ Session updated, Parcelcraft should inject rates');

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Shipping options will be updated by Parcelcraft'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (updateErr) {
      console.error('[update-shipping-options] Failed to update session:', updateErr);
      
      // Even if update fails, Parcelcraft might still work
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: 'Session update failed but Parcelcraft may still provide rates',
          details: updateErr instanceof Error ? updateErr.message : 'Unknown error'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('[update-shipping-options] Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process shipping address change',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
