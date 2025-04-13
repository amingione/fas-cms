import netlify from '@astrojs/netlify';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  // ...other config
});