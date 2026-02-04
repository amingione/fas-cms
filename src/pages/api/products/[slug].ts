// Deprecated: pricing authority moved fully to Medusa Store API.
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  return res.status(410).json({
    error: 'Deprecated: pricing data must be fetched from Medusa /store/products.',
    status: 410
  });
}
