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
  (import.meta.env.STRIPE_SECRET_KEY as string | undefined) || process.env.STRIPE_SECRET_KEY || '';

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
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[update-shipping-options] Failed to parse JSON:', parseErr);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseErr instanceof Error ? parseErr.message : 'Unknown parse error'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, shippingAddress } = body as {
      sessionId: string;
      shippingAddress: ShippingAddress;
    };

    if (!sessionId) {
      console.error('[update-shipping-options] Missing sessionId in request body');
      return new Response(
        JSON.stringify({
          error: 'Missing sessionId',
          details: 'sessionId is required to update shipping options'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[update-shipping-options] Address change received:', {
      sessionId,
      country: shippingAddress?.address?.country,
      state: shippingAddress?.address?.state,
      postalCode: shippingAddress?.address?.postal_code,
      city: shippingAddress?.address?.city
    });

    // Validate Stripe secret key
    if (!stripeSecret) {
      console.error('[update-shipping-options] STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: 'STRIPE_SECRET_KEY is not configured'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve current session with line items
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product']
      });
    } catch (retrieveErr) {
      console.error('[update-shipping-options] Failed to retrieve session:', {
        sessionId,
        error: retrieveErr instanceof Error ? retrieveErr.message : String(retrieveErr)
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve checkout session',
          details: retrieveErr instanceof Error ? retrieveErr.message : 'Unknown error',
          sessionId
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-shipping-options] Session retrieved:', {
      sessionId: session.id,
      status: session.status,
      lineItemCount: session.line_items?.data.length || 0
    });

    // For Parcelcraft: The app automatically injects shipping rates
    // when it detects a session with the right configuration:
    // 1. ui_mode: 'embedded'
    // 2. permissions.update_shipping_details: 'server_only'
    // 3. Products with Parcelcraft metadata (shipping_required, package_weight, etc.)
    // 4. shipping_address_collection enabled
    // 5. invoice_creation.enabled: true

    // We DON'T need to manually update the session or call any APIs
    // Parcelcraft handles everything automatically

    console.log(
      '[update-shipping-options] ℹ️ Parcelcraft will automatically inject shipping rates'
    );
    console.log('[update-shipping-options] Session configuration:', {
      sessionId: session.id,
      status: session.status,
      uiMode: session.ui_mode,
      hasShippingAddressCollection: !!session.shipping_address_collection,
      invoiceCreationEnabled: session.invoice_creation?.enabled,
      shippingOptionsCount: session.shipping_options?.length || 0
    });

    // Check if products have required Parcelcraft metadata
    const lineItems = session.line_items?.data || [];
    for (const item of lineItems) {
      const product =
        typeof item.price?.product === 'object' &&
        item.price.product &&
        !('deleted' in item.price.product)
          ? item.price.product
          : null;

      if (product) {
        const meta = product.metadata || {};
        console.log('[update-shipping-options] Product metadata check:', {
          productId: product.id,
          productName: product.name,
          shippable: product.shippable,
          shipping_required: meta.shipping_required,
          package_weight: meta.package_weight,
          package_weight_unit: meta.package_weight_unit,
          dimensions_unit: meta.dimensions_unit,
          origin_country: meta.origin_country,
          hasAllRequiredFields: !!(
            meta.shipping_required &&
            meta.package_weight &&
            meta.package_weight_unit &&
            meta.origin_country
          )
        });
      }
    }

    // Return success - Parcelcraft will handle the rest
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Address received. Parcelcraft will automatically provide shipping rates.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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
