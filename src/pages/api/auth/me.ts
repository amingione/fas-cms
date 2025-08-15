import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res
    .status(401)
    .json({ error: 'Session handling is managed on the client side with Auth0 SPA SDK.' });
}
