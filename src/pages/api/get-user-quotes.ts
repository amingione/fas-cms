import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '@/lib/sanityClient';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });

    if (typeof payload.email !== 'string') {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    const query = `*[_type == "quote" && customer->email == $email] | order(_createdAt desc) {
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

    const quotes = await sanityClient.fetch(query, { email: payload.email });

    return res.status(200).json({ quotes });
  } catch (error) {
    console.error('Failed to fetch user quotes:', error);
    return res.status(500).json({ message: 'Failed to fetch user quotes' });
  }
}
