import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import clerk from "@clerk/astro";


export default defineConfig({
  integrations: [clerk()],
  adapter: node({ mode: "standalone" }),
  output: "server",
  output: 'server',
  adapter: netlify(),
  integrations: [react(), tailwind()],
  build: {
    rollupOptions: {
      external: ['resend'],
    },
  },
});