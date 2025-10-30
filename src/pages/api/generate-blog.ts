import type { APIRoute } from 'astro';

const WEBHOOK_URL =
  import.meta.env.SANITY_GENERATE_SEO_CONTENT_WEBHOOK ||
  import.meta.env.PUBLIC_SANITY_GENERATE_SEO_CONTENT_WEBHOOK ||
  import.meta.env.PUBLIC_SANITY_GENERATE_SEO_CONTENT_URL;

export const prerender = false;

async function triggerWebhook(body: unknown) {
  if (!WEBHOOK_URL) {
    throw new Error('SANITY_GENERATE_SEO_CONTENT_WEBHOOK is not configured.');
  }

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body ?? {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sanity webhook responded with ${response.status}: ${text}`);
  }

  return response.status;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};
    const status = await triggerWebhook(payload);
    return new Response(
      JSON.stringify({ success: true, status }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const GET: APIRoute = async () => {
  try {
    const status = await triggerWebhook({ trigger: 'manual' });
    return new Response(
      JSON.stringify({ success: true, status }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
