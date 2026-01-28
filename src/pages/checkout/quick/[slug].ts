import type { APIRoute } from 'astro';
import { normalizeSlugValue } from '@/lib/sanity-utils';

export const GET: APIRoute = async ({ params, request }) => {
  const slugParam = params.slug ? normalizeSlugValue(params.slug) : '';
  if (!slugParam) {
    return new Response('Missing product', { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const productUrl = new URL(`/shop/${slugParam}`, origin);

  // TODO: Replace with the new checkout initiation flow.
  return Response.redirect(productUrl.toString(), 303);
};

export const HEAD: APIRoute = async ({ params, request }) => {
  const slugParam = params.slug ? normalizeSlugValue(params.slug) : '';
  if (!slugParam) {
    return new Response(null, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const productUrl = new URL(`/shop/${slugParam}`, origin);
  const headers = new Headers({ Location: productUrl.toString() });

  return new Response(null, { status: 302, headers });
};
