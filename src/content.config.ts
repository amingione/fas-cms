import { defineCollection, z } from 'astro:content';

// Explicitly declare collections so Astro does not auto-generate them.
// We don't currently ship Markdown files in these collections, but declaring
// them removes the deprecation warning and keeps future content organized.
const belak = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

const jtx = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

export const collections = { belak, jtx };
