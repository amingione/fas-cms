import { sanityFetch } from '@/lib/sanityFetch';

console.log("🧪 Loaded token prefix:", process.env.PUBLIC_SANITY_API_TOKEN?.slice(0, 8));
const query = `*[_type == "tune"]{ title }`;

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await sanityFetch({ query });
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Tune fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch tunes" });
  }
}