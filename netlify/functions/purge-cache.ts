import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const siteId = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_ADMIN_TOKEN;

  if (!siteId || !token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN' })
    };
  }

  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/purge_cache`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  const ok = res.ok;
  const text = await res.text();
  return {
    statusCode: ok ? 200 : res.status,
    body: JSON.stringify({ ok, response: text })
  };
};
