// src/lib/auth.ts
import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

let auth0Client: Auth0Client;

export async function getAuth0Client(): Promise<Auth0Client> {
  if (!auth0Client) {
    const domain =
      import.meta.env.PUBLIC_AUTH0_DOMAIN ||
      import.meta.env.AUTH0_DOMAIN ||
      'login.fasmotorsports.com';

    const clientId = import.meta.env.PUBLIC_AUTH0_CLIENT_ID || import.meta.env.AUTH0_CLIENT_ID;

    if (!domain || !clientId) {
      throw new Error(`Auth0 configuration missing. Got domain="${domain}" clientId="${clientId}"`);
    }

    auth0Client = await createAuth0Client({
      domain,
      clientId,
      authorizationParams: {
        redirect_uri: window.location.origin + '/account'
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });
  }
  return auth0Client;
}
