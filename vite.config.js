// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['PUBLIC_SANITY_PROJECT_ID', 'PUBLIC_SANITY_API_TOKEN'],
});