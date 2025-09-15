export const GET = async () => {
  return new Response(
    JSON.stringify({
      PUBLIC_SANITY_PROJECT_ID: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
      PUBLIC_SANITY_DATASET: import.meta.env.PUBLIC_SANITY_DATASET,
      PUBLIC_SANITY_API_TOKEN: import.meta.env.PUBLIC_SANITY_API_TOKEN?.slice(0, 8)
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
