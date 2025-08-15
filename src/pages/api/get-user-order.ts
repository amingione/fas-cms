import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanityClient';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  let email: string | undefined;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });

    if (typeof payload.email !== 'string') {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    email = payload.email;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const query = `*[_type == "order" && customer->email == $email] | order(_createdAt desc) {
    _id,
    title,
    status,
    _createdAt
  }`;

  try {
    const orders = await sanityClient.fetch(query, { email });
    res.status(200).json(orders);
  } catch (err) {
    console.error('Sanity query failed:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
}
