import { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanityClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Missing token' });
    }

    // TODO: replace with actual JWT verification logic
    const userId = 'mock-user-id'; // This should come from verified JWT payload

    // Fetch quotes associated with this userId (stored as customerId in Sanity)
    const query = `*[_type == "quote" && customerId == $userId] | order(_createdAt desc) {
      _id,
      _createdAt,
      status,
      items[] {
        _key,
        title,
        quantity,
        price
      },
      total,
      notes
    }`;

    // ✅ Corrected this line:
    const quotes = await sanityClient.fetch(query, { userId });

    return res.status(200).json({ quotes });
  } catch (error) {
    console.error('Failed to fetch user quotes:', error);
    return res.status(500).json({ message: 'Failed to fetch user quotes' });
  }
}
