import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ redirect }) => {
  const redirectUri = encodeURIComponent('https://fas-cms.com/dashboard'); // adjust as needed
  const auth0Domain = 'login.fasmotorsports.com';
  const clientId = 'zMZZoiIamhK5ItezIjPMJ0b3TLj7LDCY';

  const loginUrl = `https://${auth0Domain}/authorize?response_type=token&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid profile email`;

  return redirect(loginUrl);
};
