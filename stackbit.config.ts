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

  // Content sources for visual editing
  contentSources: [
    // Git-based content (Markdown/MDX/JSON/YAML) from this repo
    new GitContentSource({
      rootPath: __dirname,
      contentDirs: ['content'],
      models: [
        // ========= Global Theme =========
        {
          name: 'Theme',
          type: 'data',
          filePath: 'content/theme.json',
          fields: [
            { name: 'brandName', type: 'string', required: true },
            {
              name: 'colors',
              type: 'object',
              fields: [
                { name: 'primary', type: 'string', required: true },
                { name: 'secondary', type: 'string' },
                { name: 'accent', type: 'string' },
                { name: 'background', type: 'string' },
                { name: 'foreground', type: 'string' }
              ]
            },
            {
              name: 'buttons',
              type: 'list',
              items: {
                type: 'object',
                fields: [
                  { name: 'variant', type: 'string', required: true },
                  { name: 'className', type: 'string' }
                ]
              }
            }
          ]
        },

        // ========= Reusable Blocks =========
        {
          name: 'HeroBlock',
          type: 'data',
          filePath: 'content/blocks/hero/{slug}.json',
          fields: [
            { name: 'eyebrow', type: 'string' },
            { name: 'headline', type: 'string', required: true },
            { name: 'subtext', type: 'string' },
            { name: 'imageSrc', type: 'string' },
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
          urlPath: '/{slug}',
          filePath: 'content/pages/{slug}.json',
          fields: [
            { name: 'title', type: 'string', required: true },
            {
              name: 'sections',
              type: 'list',
              items: {
                type: 'object',
                fields: [
                  { name: 'blockType', type: 'string', required: true },
                  // For inline content
                  { name: 'headline', type: 'string' },
                  { name: 'subtext', type: 'string' },
                  { name: 'imageSrc', type: 'string' },
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
            rootPath: __dirname,
            projectId: process.env.SANITY_PROJECT_ID!,
            dataset: process.env.SANITY_DATASET || 'production',
            token: process.env.SANITY_ACCESS_TOKEN!, // READ token
            studioUrl: process.env.SANITY_STUDIO_URL || 'https://fassanity.fasmotorsports.com',
            studioInstallCommand: "echo 'skipping install'"
          })
        ]
      : [])
  ],
  siteMap: ({ documents, models }) => {
    // Find all models defined as pages
    const pageModels = models.filter((m) => m.type === 'page');

    // For each document whose model is a page, build a URL using its slug
    const entries: SiteMapEntry[] = [];
    for (const doc of documents) {
      const isPageModel = pageModels.some((m) => m.name === doc.modelName);
      if (!isPageModel) continue;

      const slug = (doc as any).slug || (doc as any).fields?.slug || doc.id;
      const isHome = slug === 'index';
      const urlPath = isHome ? '/' : `/${slug}`;

      entries.push({
        stableId: doc.id,
        urlPath,
        document: doc,
        isHomePage: isHome
      });
    }
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
