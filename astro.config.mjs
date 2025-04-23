import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import clerk from "@clerk/astro";

// Bridge env vars for SSR/serverless
if (!process.env.PUBLIC_SANITY_PROJECT_ID) {
  process.env.PUBLIC_SANITY_PROJECT_ID =
    import.meta.env.PUBLIC_SANITY_PROJECT_ID;
}
if (!process.env.PUBLIC_SANITY_API_TOKEN) {
  process.env.PUBLIC_SANITY_API_TOKEN = import.meta.env.PUBLIC_SANITY_API_TOKEN;
}
if (!process.env.PUBLIC_SANITY_DATASET) {
  process.env.PUBLIC_SANITY_DATASET =
    import.meta.env.PUBLIC_SANITY_DATASET || "production";
}

export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [react(), tailwind(), clerk()],
  build: {
    rollupOptions: {
      external: ["resend"],
    },
  },
  vite: {
    envPrefix: ["PUBLIC_", "SANITY_", "PUBLIC_SANITY_"],
  },
});
