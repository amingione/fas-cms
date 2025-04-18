import type { APIRoute } from "astro";
import { sanityFetch } from "../../lib/sanityFetch";
import { groq } from "next-sanity";

export const GET: APIRoute = async () => {
  const query = groq`*[_type == "category"]{_id, title, slug}`;
  try {
    const categories = await sanityFetch({ query });
    return new Response(JSON.stringify(categories), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch categories" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
