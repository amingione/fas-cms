// astro.config.mjs
import { defineConfig } from 'astro/config';
import image from '@astrojs/image';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sanity from '@sanity/astro';
import { fileURLToPath } from 'url';
import viteCompression from 'vite-plugin-compression';

const FN_PORT =
  process.env.NETLIFY_DEV_PORT ||
  process.env.NETLIFY_FUNCTIONS_PORT ||
  process.env.FUNCTIONS_PORT ||
  '5050';

const sanityProjectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  'r4og35qd';

const sanityDataset =
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  'production';

const sanityApiVersion =
  process.env.SANITY_API_VERSION ||
  process.env.PUBLIC_SANITY_API_VERSION ||
  '2023-06-07';

const sanityStudioUrl =
  process.env.PUBLIC_SANITY_STUDIO_URL ||
  process.env.PUBLIC_STUDIO_URL ||
  process.env.SANITY_STUDIO_URL ||
  process.env.SANITY_STUDIO_NETLIFY_BASE ||
  undefined;

// Netlify's adapter injects @netlify/vite-plugin automatically in a few
// different environments (e.g. when NETLIFY_DEV is set). When multiple copies
// are registered Vite emits a warning, so we proactively strip duplicates.
const NETLIFY_VITE_PLUGIN_NAMES = new Set([
  '@netlify/vite-plugin',
  'netlify-vite-plugin'
]);

const dedupeNetlifyVitePlugin = () => {
  const removeDuplicates = (plugins = []) => {
    const seen = new Set();
    return plugins.filter((plugin) => {
      const name = plugin?.name;
      if (!name || !NETLIFY_VITE_PLUGIN_NAMES.has(name)) {
        return true;
      }
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
  };

  return {
    name: 'dedupe-netlify-vite-plugin',
    enforce: 'pre',
    config(viteConfig) {
      if (!viteConfig?.plugins?.length) return;
      viteConfig.plugins = removeDuplicates(viteConfig.plugins);
    },
    configResolved(resolvedConfig) {
      if (!resolvedConfig?.plugins?.length) return;
      resolvedConfig.plugins = removeDuplicates(resolvedConfig.plugins);
    }
  };
};

const isDev = process.env.NODE_ENV !== 'production';

// Lazy-load svgr so dev doesn't fail if it's not installed
let svgrPlugin = null;
try {
  const mod = await import('vite-plugin-svgr');
  svgrPlugin = mod?.default ? mod.default() : mod();
} catch (err) {
  console.warn(
    '[astro.config] vite-plugin-svgr not found. SVG React imports (?react) will be disabled until it is installed.'
  );
}

// Try to include remark-gfm; skip gracefully if missing to avoid dev crashing
let remarkGfm = null;
try {
  const mod = await import('remark-gfm');
  remarkGfm = mod?.default ?? mod;
} catch (err) {
  console.warn(
    '[astro.config] remark-gfm not found. GitHub-flavored Markdown (tables, task lists) will be disabled until installed.'
  );
}

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [
    sanity({
      projectId: sanityProjectId,
      dataset: sanityDataset,
      apiVersion: sanityApiVersion,
      useCdn: false,
      stega: sanityStudioUrl
        ? {
            studioUrl: sanityStudioUrl
          }
        : undefined
    }),
    react(),
    tailwind(),
    image({
      serviceEntryPoint: '@astrojs/image/sharp'
    })
  ],
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
      dedupeNetlifyVitePlugin(),
      // Conditionally include svgr if available
      ...(svgrPlugin ? [svgrPlugin] : []),
      viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 })
    ],
    build: {
      minify: 'esbuild',
      cssMinify: 'lightningcss',
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
    // Expose VITE_* so server code can read VITE_SANITY_* via import.meta.env
    envPrefix: ['PUBLIC_', 'SANITY_', 'PUBLIC_SANITY_', 'VITE_'],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', '@fullcalendar/core', 'apexcharts'],
      exclude: [
        // Avoid prebundling particles to reduce dev 504 "Outdated Optimize Dep" churn
        'react-tsparticles',
        'tsparticles-slim',
        '@tsparticles/react',
        '@tsparticles/engine',
        'tsparticles'
      ],
      esbuildOptions: {
        define: {
          'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
        }
      }
    },
    resolve: {
      // Prevent multiple React copies across islands/SSR
      dedupe: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime'
      ],
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
        unframer$: fileURLToPath(new URL('./src/lib/unframer-shim.ts', import.meta.url)),
        moment$: fileURLToPath(new URL('./src/lib/moment-shim.ts', import.meta.url))
      }
    },
    server: {
      // Allow Netlify DevServer hosts to connect
      allowedHosts: [
        'devserver-main--fasmoto.netlify.app',
        /^(?:devserver|deploy-preview|branch|main)--.*\.netlify\.app$/
      ],
      proxy: {
        '/.netlify/functions': {
          target: `http://127.0.0.1:${FN_PORT}`,
          changeOrigin: true,
          secure: false
        },
        '/.netlify/functions/': {
          target: `http://127.0.0.1:${FN_PORT}`,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
});
