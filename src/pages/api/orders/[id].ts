// /src/pages/api/orders/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@sanity/client';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET!,
  apiVersion: '2023-01-01',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false
});

// Setup Auth0 JWKS for JWT verification
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const JWKS = AUTH0_DOMAIN
  ? createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))
  : null;

async function verifyAuth(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    if (!JWKS || !AUTH0_DOMAIN || !AUTH0_CLIENT_ID) throw new Error('Auth0 env not set');
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_CLIENT_ID
    });
    return payload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid order ID' });
  }

  // Authenticate user for GET and PATCH
  const user = await verifyAuth(req);
  if (!user || typeof user.email !== 'string') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Secure query: only allow if user email matches order's customer
      const order = await client.fetch(
        `*[_type == "order" && _id == $id && customer->email == $email][0]`,
        { id, email: user.email }
      );
      if (!order) return res.status(404).json({ message: 'Order not found or access denied' });
      return res.status(200).json(order);
    } catch (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ message: 'Failed to fetch order' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      // Only allow PATCH if user is owner of order
      const existing = await client.fetch(
        `*[_type == "order" && _id == $id && customer->email == $email][0]`,
        { id, email: user.email }
      );
      if (!existing) return res.status(403).json({ message: 'Access denied' });

      const data = req.body;
      const result = await client.patch(id).set(data).commit();
      return res.status(200).json(result);
    } catch (err) {
      console.error('Error updating order:', err);
      return res.status(500).json({ message: 'Failed to update order' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
// This code handles GET and PATCH requests for a specific order in a Sanity CMS.
// It uses the Sanity client to fetch and update order data based on the provided order ID.
// The handler function checks the request method and performs the appropriate action.
// It returns the order data for GET requests and updates the order data for PATCH requests.
// The code also includes error handling for invalid requests and server errors.
// The Sanity client is configured with the project ID, dataset, API version, and token.
// The handler function is exported as the default export for use in a Next.js API route.
// The code is structured to ensure that only valid requests are processed, and appropriate responses are returned.
// The handler function is designed to be used in a Next.js API route, allowing for easy integration with a Next.js application.
// The code is structured to ensure that only valid requests are processed, and appropriate responses are returned.
