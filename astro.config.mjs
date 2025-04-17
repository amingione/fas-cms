import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import clerk from '@clerk/astro';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react(), tailwind(), clerk()],
  build: {
    rollupOptions: {
      external: ['resend'],
    },
  },
});