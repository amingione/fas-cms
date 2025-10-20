import { sanityFetch } from '@/lib/sanityFetch';

const json = (body: Record<string, unknown>, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init
  });

export async function GET(): Promise<Response> {
  const query = `*[_type == "tune"]{ title }`;

  if (
    !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
    !import.meta.env.PUBLIC_SANITY_DATASET
  ) {
    return json({ tunes: [] }, { status: 200 });
  }

  try {
    const result = await sanityFetch<{ title?: string }[]>({ query });
    return json({ tunes: Array.isArray(result) ? result : [] }, { status: 200 });
  } catch (err: unknown) {
    console.error('❌ Tune fetch failed:', err);
    return json(
      {
        tunes: [],
        error: 'Tune fetch error',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 200 }
    );
  }
}
