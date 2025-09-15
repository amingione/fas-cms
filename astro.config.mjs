// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath, URL } from 'node:url';
// Lazy-load svgr so dev doesn't fail if it's not installed
let svgrPlugin = null;
try {
  // Top-level await is supported in ESM under Node 18+
  const mod = await import('vite-plugin-svgr');
  // mod.default is the plugin factory
  svgrPlugin = mod?.default ? mod.default() : mod();
} catch (err) {
  console.warn('[astro.config] vite-plugin-svgr not found. SVG React imports (?react) will be disabled until it is installed.');
}

// Try to include remark-gfm; skip gracefully if missing to avoid dev crashing
let remarkGfm = null;
try {
  const mod = await import('remark-gfm');
  remarkGfm = mod?.default ?? mod;
} catch (err) {
  console.warn('[astro.config] remark-gfm not found. GitHub-flavored Markdown (tables, task lists) will be disabled until installed.');
}

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
  markdown: {
    remarkPlugins: [
      // Only include gfm if the dependency is present
      ...(remarkGfm ? [remarkGfm] : [])
    ]
  },
  devToolbar: { enabled: false },
  build: {
    rollupOptions: {
      external: ['resend']
    }
  },
  vite: {
    plugins: [
      // Conditionally include svgr if available
      ...(svgrPlugin ? [svgrPlugin] : [])
    ],
    build: {
      // Raise warning limit; we'll split big libs into separate chunks below
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Group heavy vendor libs
            if (id.includes('node_modules')) {
              if (id.includes('fullcalendar')) return 'fullcalendar';
              if (id.includes('framer-motion')) return 'motion';
              if (id.includes('@radix-ui')) return 'radix';
              return 'vendor';
            }
          }
        }
      }
    },
    envPrefix: ['PUBLIC_', 'SANITY_', 'PUBLIC_SANITY_'],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@fullcalendar/core',
        'apexcharts'
      ],
      exclude: [
        // Avoid prebundling particles to reduce dev 504 "Outdated Optimize Dep" churn
        'react-tsparticles',
        'tsparticles-slim',
        '@tsparticles/react',
        '@tsparticles/engine',
        'tsparticles'
      ]
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
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
      // Allow Netlify Visual Editor/DevServer hosts to connect
      allowedHosts: [
        'devserver-main--fasmoto.netlify.app',
        /^(?:devserver|deploy-preview|branch|main)--.*\.netlify\.app$/
      ],
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
