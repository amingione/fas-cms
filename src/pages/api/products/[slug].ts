// /pages/api/products/[slug].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient as client } from '../../../lib/sanityClient';
import { normalizeSlugValue } from '@/lib/sanity-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const slug = normalizeSlugValue(id);
  if (!slug) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const query = `*[_type == "product" && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service" && slug.current == $id][0] {
    _id,
    title,
    slug,
    price,
    onSale,
    salePrice,
    compareAtPrice,
    discountPercent,
    discountPercentage,
    saleStartDate,
    saleEndDate,
    saleActive,
    saleLabel,
    description,
    images[]{ asset->{ url } }
  }`;

  try {
    const product = await client.fetch(query, { id: slug });
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(product);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}
