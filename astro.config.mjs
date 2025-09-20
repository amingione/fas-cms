// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'url';
const FN_PORT =
  process.env.NETLIFY_DEV_PORT ||
  process.env.NETLIFY_FUNCTIONS_PORT ||
  process.env.FUNCTIONS_PORT ||
  '5050';
// Lazy-load svgr so dev doesn't fail if it's not installed
let svgrPlugin = null;
try {
  // Top-level await is supported in ESM under Node 18+
  const mod = await import('vite-plugin-svgr');
  // mod.default is the plugin factory
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
    // Expose VITE_* so server code can read VITE_SANITY_* via import.meta.env
    envPrefix: ['PUBLIC_', 'SANITY_', 'PUBLIC_SANITY_', 'VITE_'],
    optimizeDeps: {
      include: ['react', 'react-router-dom', '@fullcalendar/core', 'apexcharts'],
      exclude: [
        // Avoid prebundling particles to reduce dev 504 "Outdated Optimize Dep" churn
        'react-tsparticles',
        'tsparticles-slim',
        '@tsparticles/react',
        '@tsparticles/engine',
        'tsparticles',
        'unframer'
      ]
    },
    plugins: [
      {
        name: 'react-dom-prefetch-polyfill',
        enforce: 'pre',
        transform(code, id) {
          if (id.includes('/unframer/esm/react.js')) {
            let transformed = code.replace(
              "import { preconnect, prefetchDNS } from 'react-dom';",
              "import * as ReactDOMAll from 'react-dom';\nconst preconnect = ReactDOMAll.preconnect ?? (() => {});\nconst prefetchDNS = ReactDOMAll.prefetchDNS ?? (() => {});"
            );
            transformed = transformed.replace(
              /var CustomCursorHost =\s*\/* @__PURE__ \*\/* \(\(\) =>[\s\S]*?\)\(\);/,
              'var CustomCursorHost = (props) => props.children;'
            );
            return transformed;
          }
          if (id.includes('/unframer/dist/react.js')) {
            let transformed = code
              .replaceAll(
                "(0, react_dom_1.prefetchDNS)('https://fonts.gstatic.com');",
                "if (typeof react_dom_1.prefetchDNS === 'function') { (0, react_dom_1.prefetchDNS)('https://fonts.gstatic.com'); }"
              )
              .replaceAll(
                "(0, react_dom_1.preconnect)('https://fonts.gstatic.com');",
                "if (typeof react_dom_1.preconnect === 'function') { (0, react_dom_1.preconnect)('https://fonts.gstatic.com'); }"
              )
              .replaceAll(
                "(0, react_dom_1.preconnect)('https://framerusercontent.com');",
                "if (typeof react_dom_1.preconnect === 'function') { (0, react_dom_1.preconnect)('https://framerusercontent.com'); }"
              );
            transformed = transformed.replace(
              /var CustomCursorHost =\s*\/* @__PURE__ \*\/* \(\(\) =>[\s\S]*?\)\(\);/,
              'var CustomCursorHost = (props) => props.children;'
            );
            return transformed;
          }
          return null;
        }
      }
    ],
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
        lib: fileURLToPath(new URL('./src/lib', import.meta.url))
      }
    },
    ssr: {
      noExternal: ['unframer']
    },
    server: {
      // Allow Netlify Visual Editor/DevServer hosts to connect
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
