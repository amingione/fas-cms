import type { APIRoute } from 'astro';
import { SITE_PAGES } from '@/data/pages-index';

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();
  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }

  const terms = query.split(/\s+/).filter(Boolean);

  const scored = SITE_PAGES.map((p, idx) => {
    const hay = [p.title, p.path, ...(p.keywords || [])].join(' ').toLowerCase();
    const hits = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
    return { page: p, score: hits + (p.title.toLowerCase().includes(query) ? 1 : 0), idx };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
    .slice(0, 24);

  const results = scored.map(({ page }) => ({
    _id: page.path,
    _type: 'page',
    title: page.title,
    description: page.description || '',
    slug: page.path.replace(/^\//, ''),
    url: page.path
  }));

  return new Response(JSON.stringify({ results }), { status: 200 });
};
