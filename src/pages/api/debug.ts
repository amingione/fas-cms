export const GET = async () => {
    return new Response(
      JSON.stringify({
        PUBLIC_SANITY_PROJECT_ID: process.env.PUBLIC_SANITY_PROJECT_ID,
        PUBLIC_SANITY_DATASET: process.env.PUBLIC_SANITY_DATASET,
        PUBLIC_SANITY_API_TOKEN: process.env.PUBLIC_SANITY_API_TOKEN?.slice(0, 8),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };