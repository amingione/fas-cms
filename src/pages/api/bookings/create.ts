// /pages/api/bookings/create.ts
import { sanityClient } from '@lib/sanityClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { customerId, bookingDate, service, notes } = req.body;

  try {
    const newBooking = await sanityClient.create({
      _type: 'booking',
      customer: { _type: 'reference', _ref: customerId },
      bookingDate,
      service,
      status: 'pending',
      notes
    });

    res.status(200).json(newBooking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err });
  }
}
