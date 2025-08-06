// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Bridge env vars for SSR/serverless
if (!import.meta.env.PUBLIC_SANITY_PROJECT_ID) {
  import.meta.env.PUBLIC_SANITY_PROJECT_ID = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
}
if (!import.meta.env.PUBLIC_SANITY_API_TOKEN) {
  import.meta.env.PUBLIC_SANITY_API_TOKEN = import.meta.env.PUBLIC_SANITY_API_TOKEN;
}
if (!import.meta.env.PUBLIC_SANITY_DATASET) {
  import.meta.env.PUBLIC_SANITY_DATASET = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
}

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react(), tailwind()],
  build: {
    rollupOptions: {
      external: ['resend']
    }
  },
  vite: {
    envPrefix: ['PUBLIC_', 'SANITY_', 'PUBLIC_SANITY_'],
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@pages': '/src/pages',
        '@lib': '/src/lib'
      }
    }
  }
});
