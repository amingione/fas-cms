import type { APIRoute } from 'astro';
import { requireVendor } from '@/server/vendor-portal/auth';
import { sanity } from '@/server/sanity-client';
import { jsonResponse } from '@/server/http/responses';

export const GET: APIRoute = async ({ request, url }) => {
  const ctx = await requireVendor(request);
  if (!ctx.ok) return ctx.response;

  try {
    const limit = Number(new URL(url).searchParams.get('limit') || 5);
    const type = new URL(url).searchParams.get('type') || 'all';

    const posts = await sanity.fetch(
      `*[_type == "vendorPost" 
        && defined(publishedAt) 
        && publishedAt <= now()
        && (!defined(expiresAt) || expiresAt > now())
        ${type !== 'all' ? '&& postType == $type' : ''}
      ] | order(pinned desc, priority desc, publishedAt desc) [0...$limit]{
        _id,
        title,
        slug,
        postType,
        priority,
        excerpt,
        featuredImage { asset-> { url } },
        publishedAt,
        pinned,
        author->{ name }
      }`,
      { type: type !== 'all' ? type : undefined, limit }
    );

    return jsonResponse({ posts }, { status: 200 }, { noIndex: true });
  } catch (err) {
    console.error('[vendor blog api] failed', err);
    return jsonResponse({ message: 'Internal server error' }, { status: 500 }, { noIndex: true });
  }
};
