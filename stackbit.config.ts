// stackbit.config.ts
import { defineStackbitConfig } from '@stackbit/types';
import type { SiteMapEntry } from '@stackbit/types';
import fs from 'fs';
import path from 'path';
import { GitContentSource } from '@stackbit/cms-git';


export default defineStackbitConfig({
  stackbitVersion: '~0.6.0',
  ssgName: 'custom',
  nodeVersion: '18',

  // Let NVE boot your Astro dev server and choose the port
  // Bind to 0.0.0.0 so the editor container can reach it
  devCommand: 'yarn astro dev --host 0.0.0.0',

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
                  { name: 'blockType', type: 'string', required: true },
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
    })
  ],
  siteMap: ({ documents, models }) => {
    const pageModelNames = new Set(models.filter((m) => m.type === 'page').map((m) => m.name));

    const entries: SiteMapEntry[] = documents
      .filter((d) => pageModelNames.has(d.modelName))
      .map((d) => {
        const doc: any = d as any; // allow access to optional fields without TS errors
        const slug: string | undefined = doc.fields?.slug ?? doc.slug;
        const computedUrl: string =
          doc.urlPath ?? (slug ? (slug === 'index' ? '/' : `/${slug}`) : '/');

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

    return entries;
  },
  
});
