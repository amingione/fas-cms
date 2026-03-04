// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sanity from '@sanity/astro';
import { fileURLToPath } from 'url';
import viteCompression from 'vite-plugin-compression';

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA =
  process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA || '1';
process.env.BROWSERSLIST_IGNORE_OLD_DATA = process.env.BROWSERSLIST_IGNORE_OLD_DATA || '1';

const FN_PORT =
  process.env.NETLIFY_DEV_PORT ||
  process.env.NETLIFY_FUNCTIONS_PORT ||
  process.env.FUNCTIONS_PORT ||
  '5050';

const sanityProjectId =
  process.env.SANITY_PROJECT_ID ||
  process.env.PUBLIC_SANITY_PROJECT_ID ||
  'r4og35qd';

const sanityDataset =
  process.env.SANITY_DATASET ||
  process.env.PUBLIC_SANITY_DATASET ||
  'production';

const sanityApiVersion =
  process.env.SANITY_API_VERSION || process.env.PUBLIC_SANITY_API_VERSION || '2023-06-07';

const sanityStudioUrl =
  process.env.PUBLIC_SANITY_STUDIO_URL || process.env.SANITY_STUDIO_URL || undefined;

// Netlify's adapter injects @netlify/vite-plugin automatically in a few
// different environments (e.g. when NETLIFY_DEV is set). When multiple copies
// are registered Vite emits a warning, so we proactively strip duplicates.
const NETLIFY_VITE_PLUGIN_NAMES = new Set(['@netlify/vite-plugin', 'netlify-vite-plugin']);

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

// Lazy-load svgr so dev doesn't fail if it's not installed
let svgrPlugin = null;
try {
  const mod = await import('vite-plugin-svgr');
  svgrPlugin = mod?.default ? mod.default() : mod();
} catch {
  console.warn(
    '[astro.config] vite-plugin-svgr not found. SVG React imports (?react) will be disabled until it is installed.'
  );
}

// Try to include remark-gfm; skip gracefully if missing to avoid dev crashing
let remarkGfm = null;
try {
  const mod = await import('remark-gfm');
  remarkGfm = mod?.default ?? mod;
} catch {
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
    tailwind()
  ],
  image: {
    service: {
      entrypoint: '@astrojs/image/services/netlify'
    },
    domains: ['cdn.sanity.io', 'cdn.sanityusercontent.com']
  },
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
            // Group only the heaviest shared libraries; let Vite split the rest per-page
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (id.includes('fullcalendar')) return 'fullcalendar';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('swiper')) return 'swiper';
            if (id.includes('apexcharts')) return 'apexcharts';
            if (id.includes('tsparticles')) return 'particles';
            if (id.includes('react-dnd')) return 'dnd';
            return undefined;
          }
        }
      }
    },
    envPrefix: ['PUBLIC_'],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@fullcalendar/core',
        'apexcharts',
        'sonner',
        'framer-motion',
        '@headlessui/react',
        '@heroicons/react/20/solid',
        '@heroicons/react/24/outline',
        'lucide-react',
        'clsx',
        'tailwind-merge'
      ],
      exclude: [
        // Avoid prebundling particles to reduce dev 504 "Outdated Optimize Dep" churn
        'react-tsparticles',
        'tsparticles-slim',
        '@tsparticles/react',
        '@tsparticles/engine',
        'tsparticles'
      ],
      esbuildOptions: {}
    },
    resolve: {
      // Prevent multiple React copies across islands/SSR
      dedupe: ['react', 'react-dom'],
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
      // Prevent intermittent Astro island hydrate failures when the page and
      // module URLs resolve under different local hosts (localhost/127.0.0.1/
      // Netlify dev host). Module scripts require CORS in that case.
      cors: true,
      // Disable HMR in this local Astro+Netlify middleware mode; the websocket
      // handshake is unreliable and can load mixed dep hashes, which leads to
      // duplicate React runtimes and invalid-hook hydration failures.
      hmr: false,
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
