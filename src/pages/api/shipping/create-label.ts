import EasyPost from '@easypost/api';
import { createClient } from '@sanity/client';
import type { APIRoute } from 'astro';

const easypost = new EasyPost(import.meta.env.EASYPOST_API_KEY!);

const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
  token: import.meta.env.SANITY_API_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, shipmentId, rateId } = await request.json();

    if (!orderId || !shipmentId || !rateId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Buy shipping label
    const shipment = await easypost.Shipment.retrieve(shipmentId);
    await shipment.buy(rateId);

    // Update order with shipping info
    await sanityClient
      .patch(orderId)
      .set({
        easyPostShipmentId: shipment.id,
        trackingNumber: shipment.tracking_code,
        trackingUrl: shipment.tracker?.public_url,
        shippingLabelUrl: shipment.postage_label?.label_url,
        carrier: shipment.selected_rate?.carrier,
        service: shipment.selected_rate?.service,
        labelCost: shipment.selected_rate?.rate ? parseFloat(shipment.selected_rate.rate) : null,
        labelCreatedAt: new Date().toISOString(),
        easyPostTrackerId: shipment.tracker?.id
      })
      .commit();

    console.log('✅ Shipping label created for order:', orderId);

    return new Response(
      JSON.stringify({
        success: true,
        trackingNumber: shipment.tracking_code,
        labelUrl: shipment.postage_label?.label_url
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('EasyPost label creation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create shipping label',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
