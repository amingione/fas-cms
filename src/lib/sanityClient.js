import sanityClient from '@sanity/client';

const client = sanityClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2023-06-07', // use your version
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false, // always fetch fresh for cart, etc.
});

export default client;