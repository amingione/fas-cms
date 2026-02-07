/**
 * Complete Order After Payment
 * Converts Medusa cart to order and syncs to Sanity for fulfillment
 */
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-config';
import { createClient } from '@sanity/client';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion
});

const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID!,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  token: import.meta.env.SANITY_API_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { cart_id, payment_intent_id } = await request.json();

    if (!cart_id || !payment_intent_id) {
      return new Response(JSON.stringify({ error: 'cart_id and payment_intent_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch Payment Intent to get shipping details and payment status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Complete cart in Medusa (convert to order)
    const medusaUrl = import.meta.env.MEDUSA_API_URL || 'http://localhost:9000';
    const completeResponse = await fetch(`${medusaUrl}/store/carts/${cart_id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to complete cart in Medusa');
    }

    const { order } = await completeResponse.json();

    // Sync order to Sanity for fulfillment
    await syncOrderToSanity(order, paymentIntent);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_number: order.display_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Order completion error:', error);

    // Don't fail completely - webhook will handle this
    return new Response(
      JSON.stringify({
        warning: 'Order may be completed via webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Sync completed order to Sanity for fulfillment workflow
 */
async function syncOrderToSanity(medusaOrder: any, paymentIntent: any) {
  try {
    // Check if order already exists (idempotency)
    const existing = await sanityClient.fetch(
      `*[_type == "order" && medusaOrderId == $orderId][0]`,
      { orderId: medusaOrder.id }
    );

    if (existing) {
      console.log(`Order ${medusaOrder.id} already exists in Sanity`);
      return existing;
    }

    // Extract shipping details from Payment Intent metadata
    const shipping = paymentIntent.shipping || {};
    const metadata = paymentIntent.metadata || {};

    // Create order document in Sanity
    const sanityOrder = await sanityClient.create({
      _type: 'order',
      medusaOrderId: medusaOrder.id,
      orderNumber: medusaOrder.display_id,
      status: 'pending_fulfillment',

      // Customer info
      customerEmail: medusaOrder.email,
      customerName: shipping.name || 'Customer',
      customerPhone: shipping.phone,

      // Shipping info
      shippingAddress: {
        street1: shipping.address?.line1,
        street2: shipping.address?.line2,
        city: shipping.address?.city,
        state: shipping.address?.state,
        postalCode: shipping.address?.postal_code,
        country: shipping.address?.country
      },

      // Shipping method (from Shippo quote)
      shippingMethod: {
        carrier: metadata.carrier,
        serviceName: metadata.service_name,
        deliveryDays: metadata.delivery_days,
        shippoRateId: metadata.shippo_rate_id, // Used for label purchase
        amountCents: parseInt(metadata.shipping_amount_cents || '0')
      },

      // Order items
      items: medusaOrder.items.map((item: any) => ({
        productId: item.variant.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      })),

      // Financial
      subtotalCents: medusaOrder.subtotal,
      shippingCents: medusaOrder.shipping_total,
      totalCents: medusaOrder.total,

      // Payment
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),

      // Fulfillment tracking (updated manually in Sanity)
      fulfillmentStatus: 'pending',
      packingSlipPrinted: false,
      labelPurchased: false,

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`Order synced to Sanity: ${sanityOrder._id}`);
    return sanityOrder;
  } catch (error) {
    console.error('Sanity sync error:', error);
    throw error;
  }
}
