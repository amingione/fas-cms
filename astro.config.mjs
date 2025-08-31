// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath, URL } from 'node:url';

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
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/.netlify/functions': {
          target: 'http://127.0.0.1:5050',
          changeOrigin: true,
          secure: false
        },
        '/.netlify/functions/': {
          target: 'http://127.0.0.1:5050',
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
});
