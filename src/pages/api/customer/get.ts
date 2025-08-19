import { defineEventHandler, readBody, setHeader, eventHandler } from 'h3';
import { createClient } from '@sanity/client';

const handler = defineEventHandler(async (event) => {
  setHeader(event, 'Access-Control-Allow-Origin', '*');
  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization');
  setHeader(event, 'Content-Type', 'application/json');

  if (event.req.method === 'OPTIONS') {
    return '';
  }

  const projectId = import.meta.env.SANITY_PROJECT_ID || import.meta.env.VITE_SANITY_PROJECT_ID;
  const dataset = import.meta.env.SANITY_DATASET || import.meta.env.VITE_SANITY_DATASET;
  const token =
    import.meta.env.SANITY_READ_TOKEN ||
    import.meta.env.SANITY_TOKEN ||
    import.meta.env.VITE_SANITY_TOKEN;
  const apiVersion = import.meta.env.SANITY_API_VERSION || '2024-10-01';

  if (!projectId || !dataset) {
    return {
      error: 'Server misconfigured: missing SANITY_PROJECT_ID or SANITY_DATASET'
    };
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token, // optional for public datasets
    useCdn: false
  });

  try {
    const { email } = (await readBody(event)) || {};
    const emailLc = (email || '').toString().trim().toLowerCase();
    if (!emailLc) {
      return { error: 'Missing email' };
    }

    const data = await client.fetch(`*[_type == "customer" && email == $email][0]`, {
      email: emailLc
    });
    return data || null;
  } catch (err) {
    return { error: 'Failed to fetch customer data' };
  }
});

export default handler;
