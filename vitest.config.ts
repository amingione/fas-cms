import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    env: {
      PUBLIC_BASE_URL: 'https://example.com',
      STRIPE_SECRET_KEY: 'sk_test_local',
      SANITY_FUNCTIONS_BASE_URL: 'https://example.com'
    }
  }
})
