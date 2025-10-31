import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { definePreviewUrl } from '@sanity/preview-url-secret/define-preview-url';
import { setPasswordAction } from '../../sanity/components/SetPasswordAction';
import { schemaTypes } from '../../sanity/schemaTypes';

const projectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  'r4og35qd';

const dataset =
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production';

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ||
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_SANITY_SITE_URL ||
  undefined;

const previewPath = process.env.SANITY_STUDIO_PREVIEW_PATH || '/';
const previewEnableRoute = process.env.SANITY_STUDIO_PREVIEW_ENABLE_URL || '/api/preview';

const disableVisionOverride =
  (process.env.SANITY_DISABLE_VISION ||
    process.env.SANITY_STUDIO_DISABLE_VISION ||
    process.env.PUBLIC_SANITY_DISABLE_VISION ||
    '')
    .toString()
    .toLowerCase()
    .trim() === 'true';

if (disableVisionOverride && process.env.NODE_ENV !== 'production') {
  console.info('[sanity] Vision tool disabled via SANITY_DISABLE_VISION flag.');
}

const plugins: any[] = [];

plugins.push(
  presentationTool({
    previewUrl: definePreviewUrl({
      origin: previewOrigin,
      preview: previewPath,
      previewMode: {
        enable: previewEnableRoute,
      },
    }),
  }),
);

export default defineConfig({
  name: 'default',
  title: 'FAS Studio',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins,
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
