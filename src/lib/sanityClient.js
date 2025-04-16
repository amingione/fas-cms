import sanityClient from '@sanity/client';
import dotenv from 'dotenv';

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  token: process.env.SANITY_API_TOKEN,
  dataset: 'production',
  apiVersion: '2023-06-07', // use your version
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false, // always fetch fresh for cart, etc.
});

export default client;