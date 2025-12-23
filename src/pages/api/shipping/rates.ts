import EasyPost from '@easypost/api';
import type { APIRoute } from 'astro';

const easypost = new EasyPost(import.meta.env.EASYPOST_API_KEY!);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { fromAddress, toAddress, parcel } = await request.json();

    // Validate inputs
    if (!toAddress || !parcel) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Create shipment
    const shipment = await easypost.Shipment.create({
      from_address: fromAddress || {
        street1: '123 Main St',
        city: 'Your City',
        state: 'CA',
        zip: '12345',
        country: 'US'
      },
      to_address: toAddress,
      parcel: parcel
    });

    return new Response(
      JSON.stringify({
        success: true,
        rates: shipment.rates,
        shipmentId: shipment.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('EasyPost rate fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch shipping rates',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
