import { defineConfig } from 'sanity';
import { setPasswordAction } from './sanity/components/SetPasswordAction';
import { schemaTypes } from './apps/fas-sanity/schemaTypes';

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
  schema: { types: schemaTypes },
  plugins: [],
  document: {
    // Add a "Set Password" action to vendor and customer docs in Studio
    actions: (prev, ctx) => {
      const t = ctx.schemaType;
      if (t === 'vendor' || t === 'customer') {
        return [...prev, setPasswordAction];
      }
      return prev;
    }
  }
});
