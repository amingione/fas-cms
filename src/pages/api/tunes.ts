import { sanityFetch } from '@/lib/sanityFetch';

export async function GET(): Promise<Response> {
  console.log("🧪 TUNE API DEBUG →", {
    tokenPrefix: import.meta.env.SANITY_API_TOKEN?.slice(0, 8),
    projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: import.meta.env.PUBLIC_SANITY_DATASET
  });

  const query = `*[_type == "tune"]{ title }`;

  if (
    !import.meta.env.SANITY_API_TOKEN ||
    !import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
    !import.meta.env.PUBLIC_SANITY_DATASET
  ) {
    return new Response(JSON.stringify({ error: "Missing Sanity credentials" }), {
      status: 500
    });
  }

  try {
    const result = await sanityFetch({ query });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error("❌ Tune fetch failed:", err);
    return new Response(JSON.stringify({
      error: "Tune fetch error",
      details: err.message || "Unknown error"
    }), {
      status: 500
    });
  }
}