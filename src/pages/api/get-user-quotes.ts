import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanityClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Fetch quotes associated with this userId (stored as clerkId in Sanity)
    const query = `*[_type == "quote" && clerkId == $userId] | order(_createdAt desc) {
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
