// This is the ONLY file that sets up and exports the Sanity client
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2023-06-07',
  token: import.meta.env.SANITY_API_TOKEN,
  useCdn: false,
});