// stackbit.config.ts
import { defineStackbitConfig, SiteMapEntry } from '@stackbit/types';
import fs from 'fs';
import path from 'path';
import { GitContentSource } from '@stackbit/cms-git';
import { SanityContentSource } from '@stackbit/cms-sanity';

// Normalize Sanity env vars to strings to satisfy TS types
const SANITY_PROJECT_ID: string =
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  '';
const SANITY_DATASET: string =
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production';
const SANITY_TOKEN: string =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.VITE_SANITY_API_TOKEN ||
  '';
const SANITY_STUDIO_URL: string =
  process.env.SANITY_STUDIO_URL || process.env.SANITY_STUDIO_NETLIFY_BASE || '';

// Toggle Sanity source via env (defaults to disabled to avoid schema fetch errors)
const ENABLE_SANITY: boolean =
  String(process.env.ENABLE_SANITY || '').toLowerCase() === 'true' ||
  String(process.env.ENABLE_SANITY || '') === '1';

export default defineStackbitConfig({
  stackbitVersion: '~0.6.0',
  ssgName: 'custom',
  nodeVersion: '18',

  // Let the Visual Editor set PORT; bind to 0.0.0.0 so the editor container can reach it
  // Call astro directly to avoid shell argument forwarding issues with yarn scripts
  devCommand: 'astro dev --host 0.0.0.0 --port $PORT',

  // Astro integration (NVE watches for these)
  experimental: {
    ssg: {
      name: 'Astro',
      logPatterns: { up: ['is ready', 'astro'] },
      directRoutes: { 'socket.io': 'socket.io' },
      passthrough: ['/vite-hmr/**']
    }
  },

  // ...
  contentSources: [
    new GitContentSource({
      rootPath: __dirname,
      contentDirs: ['content'],
      models: [
        // ========= Reusable Blocks =========
        {
          name: 'HeroBlock',
          type: 'data',
          filePath: 'content/blocks/hero/{slug}.json',
          fields: [
            { name: 'eyebrow', type: 'string' },
            { name: 'headline', type: 'string', required: true },
            { name: 'subtext', type: 'string' },
            { name: 'imageSrc', type: 'image' },
            {
              name: 'cta',
              type: 'object',
              fields: [
                { name: 'text', type: 'string' },
                { name: 'href', type: 'string' },
                { name: 'variant', type: 'string' }
              ]
            }
          ]
        },
        {
          name: 'RichTextBlock',
          type: 'data',
          filePath: 'content/blocks/rich/{slug}.json',
          fields: [
            { name: 'title', type: 'string' },
            { name: 'body', type: 'markdown' }
          ]
        },

        // ========= Pages =========
        {
          name: 'Page',
          type: 'page',
          labelField: 'title',
          fieldGroups: [{ name: 'design', label: 'Design' }],
          urlPath: '/{slug}',
          filePath: 'content/pages/{slug}.json',
          fields: [
            {
              name: 'slug',
              type: 'string',
              required: true,
              description: 'URL slug ("index" becomes "/")'
            },
            { name: 'title', type: 'string', required: true },
            {
              name: 'sections',
              type: 'list',
              items: {
                fieldGroups: [{ name: 'design', label: 'Design' }],
                type: 'object',
                fields: [
                  // For inline content
                  {
                    name: 'blockType',
                    type: 'enum',
                    options: [
                      'Hero',
                      'RichText',
                      'Services',
                      'Products',
                      'Testimonials',
                      'IGLA',
                      'TruckPackagesHero',
                      'LuxuryFeatures',
                      'WheelsHero'
                    ],
                    required: true
                  },
                  { name: 'headline', type: 'string' },
                  { name: 'subtext', type: 'string' },
                  { name: 'imageSrc', type: 'image' },
                  {
                    name: 'cta',
                    type: 'object',
                    fields: [
                      { name: 'text', type: 'string' },
                      { name: 'href', type: 'string' },
                      { name: 'variant', type: 'string' }
                    ]
                  },
                  // Secondary CTA support for complex blocks
                  {
                    name: 'ctaSecondary',
                    type: 'object',
                    fields: [
                      { name: 'text', type: 'string' },
                      { name: 'href', type: 'string' },
                      { name: 'variant', type: 'string' }
                    ]
                  },
                  // Additional headings and badge/kicker lines for hero-style blocks
                  { name: 'badge', type: 'string' },
                  { name: 'titleTop', type: 'string' },
                  { name: 'titleMid', type: 'string' },
                  { name: 'titleBottom', type: 'string' },
                  { name: 'kicker', type: 'string' },
                  // Or reference a reusable block by path
                  {
                    name: 'ref',
                    type: 'string',
                    description: 'Optional path to a block JSON file under content/blocks'
                  }
                ]
              }
            }
          ]
        }
      ]
    }),
    // Conditionally include Sanity only when explicitly enabled and configured
    ...(ENABLE_SANITY && SANITY_PROJECT_ID && SANITY_DATASET
      ? [
          new SanityContentSource({
            rootPath: __dirname,
            // Point to the project root where sanity.config.ts lives
            studioPath: __dirname,
            projectId: SANITY_PROJECT_ID,
            token: SANITY_TOKEN,
            dataset: SANITY_DATASET,
            studioUrl: SANITY_STUDIO_URL
          })
        ]
      : [])
  ],
  siteMap: ({ documents, models }) => {
    const pageModelNames = new Set(models.filter((m) => m.type === 'page').map((m) => m.name));

    const entries: SiteMapEntry[] = documents
      .filter((d) => pageModelNames.has(d.modelName))
      .map((d) => {
        const doc: any = d as any; // allow access to optional fields without TS errors
        const rawSlug: any = (doc.fields && doc.fields.slug) ?? (doc as any).slug;
        const slug: string | undefined =
          typeof rawSlug === 'string' ? rawSlug : (rawSlug?.current ?? undefined);
        let computedUrl: string =
          doc.urlPath ?? (slug ? (slug === 'index' ? '/' : `/${slug}`) : '/');
        // Route Sanity product docs under /shop/{slug}
        if ((d as any).srcType === 'sanity' && (d as any).modelName === 'product' && slug) {
          computedUrl = `/shop/${slug}`;
        }

        const entry: SiteMapEntry = {
          stableId: d.id,
          urlPath: computedUrl,
          document: d,
          isHomePage: computedUrl === '/'
        };
        return entry;
      });

    // Also include Astro pages from src/pages (non-dynamic, non-API)
    try {
      const root = path.join(__dirname, 'src', 'pages');
      const urls: string[] = [];
      const walk = (dir: string) => {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of list) {
          const full = path.join(dir, ent.name);
          const rel = path.relative(root, full);
          if (ent.isDirectory()) {
            if (rel.startsWith('api')) continue; // skip API endpoints
            walk(full);
          } else if (
            ent.isFile() &&
            (ent.name.endsWith('.astro') || ent.name.endsWith('.md') || ent.name.endsWith('.mdx'))
          ) {
            if (rel.includes('[')) continue; // skip dynamic routes like [slug]
            // Build URL path: strip extension and map index.astro appropriately
            const noExt = rel.replace(/\\.(astro|md|mdx)$/, '');
            let url = '/' + noExt.replace(/\\\\/g, '/');
            url = url.replace(/\\/g, '/');
            url = url.replace(/index$/i, '');
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (url === '') url = '/';
            urls.push(url);
          }
        }
      };
      if (fs.existsSync(root)) walk(root);
      const astroEntries: SiteMapEntry[] = Array.from(new Set(urls)).map((url) => ({
        stableId: `astro:${url}`,
        urlPath: url,
        isHomePage: url === '/',
        document: {
          srcType: 'astro',
          srcProjectId: '',
          modelName: 'astroPage',
          id: `astro:${url}`
        }
      }));
      // Merge and de-duplicate by urlPath (content docs take precedence)
      const seen = new Set(entries.map((e) => e.urlPath));
      for (const ae of astroEntries) {
        if (!seen.has(ae.urlPath)) entries.push(ae);
      }
    } catch (e) {
      // Ignore FS errors; Stackbit Cloud may limit FS access
      console.warn('siteMap: failed to scan Astro pages:', e);
    }

    // Ensure key routes always appear in the Editor (static + dynamic pattern)
    const manualUrls = [
      '/',
      '/truckPackages',
      '/power-packages',
      '/porting',
      '/customFab',
      '/services',
      '/schedule',
      '/coreExchange',
      // Spec sheet pages
      '/BilletBearingPlateSpecs',
      '/PredatorPulleySpecsSheet',
      '/HellcatPulleyHubSpecSheet',
      // Shop
      '/shop',
      '/shop/{slug}'
    ];
    for (const url of manualUrls) {
      if (!entries.some((e) => e.urlPath === url)) {
        entries.push({
          stableId: `static:${url}`,
          urlPath: url,
          isHomePage: url === '/',
          document: {
            srcType: 'static',
            srcProjectId: '',
            modelName: 'staticPage',
            id: `static:${url}`
          }
        });
      }
    }

    return entries;
  }
});
