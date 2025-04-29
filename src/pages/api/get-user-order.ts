import { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanityClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Missing email parameter' });
  }

  const query = `*[_type == "order" && email == $email] | order(_createdAt desc) {
    _id,
    title,
    status,
    _createdAt
  }`;

  const orders = await sanityClient.fetch(query, { email });

  res.status(200).json(orders);
}
