// /src/lib/sanityClient.js

import sanityClient from '@sanity/client';

const client = sanityClient({
  projectId: 'r4og35qd',
  dataset: 'production',
  useCdn: false, // required for write operations
  apiVersion: '2024-04-08',
  token: import.meta.env.PUBLIC_SANITY_WRITE_TOKEN // or from .env
});

export default client;