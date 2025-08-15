import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ redirect }) => {
  const returnTo = encodeURIComponent('https://fasmotorsports.com');
  return redirect(
    `https://login.fasmotorsports.com/v2/logout?client_id=zMZZoiIamhK5ItezIjPMJ0b3TLj7LDCY&returnTo=${returnTo}`,
    302
  );
};
