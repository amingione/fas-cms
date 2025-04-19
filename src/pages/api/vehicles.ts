import { sanityFetch } from '@/lib/sanityFetch';

export const GET = async () => {
  console.log("🧪 VEHICLE API DEBUG →", {
    tokenPrefix: process.env.PUBLIC_SANITY_API_TOKEN?.slice(0, 8),
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.PUBLIC_SANITY_DATASET
  });

  const query = `*[_type == "vehicleModel"]{ model }`;

  if (
    !process.env.PUBLIC_SANITY_API_TOKEN ||
    !process.env.PUBLIC_SANITY_PROJECT_ID ||
    !process.env.PUBLIC_SANITY_DATASET
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
  } catch (err) {
    console.error("❌ Vehicle fetch failed:", err);
    return new Response(JSON.stringify({ error: "Vehicle fetch error", details: err.message }), {
      status: 500
    });
  }
};