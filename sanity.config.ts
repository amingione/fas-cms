import { defineConfig } from 'sanity';
import { setPasswordAction } from './sanity/components/SetPasswordAction';
import { schemaTypes } from './sanity/schemaTypes';

// Minimal Sanity v3 Studio config used by local tooling.
// Extend this if you want a richer Studio experience.

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
