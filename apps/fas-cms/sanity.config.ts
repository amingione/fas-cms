import { defineConfig } from 'sanity';
import customer from './sanity/schemas/customer';

// Minimal Sanity v3 Studio config so Stackbit detects v3 schema loader.
// This does NOT define local schema types; it enables v3 detection to avoid
// the legacy v2 "part:@sanity/base/schema" path. If you want full Sanity models
// in the Visual Editor, add your schema types here or mount your Studio.

const projectId = process.env.SANITY_PROJECT_ID
  || process.env.PUBLIC_SANITY_PROJECT_ID
  || process.env.SANITY_STUDIO_PROJECT_ID
  || 'r4og35qd';

const dataset = process.env.SANITY_DATASET
  || process.env.PUBLIC_SANITY_DATASET
  || process.env.SANITY_STUDIO_DATASET
  || 'production';

export default defineConfig({
  name: 'default',
  title: 'FAS Studio',
  projectId,
  dataset,
  // Keep empty to avoid requiring local schema files; Stackbit can still
  // fetch content via APIs and start without v2 legacy fetch.
  schema: { types: [customer] },
  plugins: []
});
