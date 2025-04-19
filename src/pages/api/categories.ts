import { sanityFetch } from "../../lib/sanityFetch";
import { groq } from "next-sanity";

export default async function handler(req: Request): Promise<Response> {
  console.log("🧪 CATEGORY API DEBUG →", {
    tokenPrefix: process.env.SANITY_API_TOKEN?.slice(0, 8) || "undefined",
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || "undefined",
    dataset: process.env.PUBLIC_SANITY_DATASET || "undefined"
  });

  const query = groq`*[_type == "category"]{_id, title, slug}`;

  try {
    const categories = await sanityFetch({ query });
    return new Response(JSON.stringify(categories), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ API /categories failed:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch categories", details: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
