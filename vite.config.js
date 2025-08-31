// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  envPrefix: ['PUBLIC_', 'VITE_'],
  server: {
    // Allow Netlify Visual Editor/devserver hostnames
    allowedHosts: [
      'devserver-main--fasmoto.netlify.app',
      /^(?:devserver|deploy-preview|branch|main)--.*\.netlify\.app$/
    ]
  }
});
