// stackbit.config.ts
import { defineStackbitConfig } from '@stackbit/types';
import type { SiteMapEntry } from '@stackbit/types';
import { SanityContentSource } from '@stackbit/cms-sanity';
import { GitContentSource } from '@stackbit/cms-git';

const enableSanity = process.env.ENABLE_SANITY === 'true';

export default defineStackbitConfig({
  stackbitVersion: '~0.6.0',
  ssgName: 'custom',
  nodeVersion: '18',

  // Let NVE boot your Astro dev server on the port it chooses
  devCommand: 'yarn astro dev --port 3000 --host 127.0.0.1',

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
    }),
    // Optionally enable Sanity (toggle via ENABLE_SANITY=true)
    ...(enableSanity
      ? [
          new SanityContentSource({
            rootPath: '/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-sanity',
            projectId: process.env.SANITY_PROJECT_ID as string,
            dataset: (process.env.SANITY_DATASET || 'production') as string,
            token: process.env.SANITY_ACCESS_TOKEN as string
          } as unknown as any)
        ]
      : [])
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

    return entries;
  },
  ...(enableSanity
    ? {
        modelExtensions: [
          { name: 'product', type: 'page', urlPath: '/shop/{slug}' },
          { name: 'category', type: 'page', urlPath: '/shop?category={slug}' }
        ]
      }
    : {})
});
