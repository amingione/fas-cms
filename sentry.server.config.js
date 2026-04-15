import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  enableLogs: true,
  tracesSampleRate: 1.0
});
