// src/lib/auth.ts
import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

let auth0Client: Auth0Client;

export async function getAuth0Client(): Promise<Auth0Client> {
  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain: import.meta.env.PUBLIC_AUTH0_DOMAIN,
      clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  }
  return auth0Client;
}
