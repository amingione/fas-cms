// /pages/api/products/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient as client } from '../../../lib/sanityClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const query = `*[_type == "product" && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && slug.current == $id][0] {
    _id,
    title,
    slug,
    price,
    description,
    images[]{ asset->{ url } }
  }`;

  try {
    const product = await client.fetch(query, { id });
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(product);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}
