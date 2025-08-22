import { createClient } from '@sanity/client';
export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: process.env.SANITY_API_VERSION || '2024-10-01',
  token: process.env.SANITY_WRITE_TOKEN!,
  useCdn: false,
  perspective: 'published'
});
