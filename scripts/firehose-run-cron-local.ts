import {handler} from '../netlify/functions/firehose-brand-ingest-cron';

async function main() {
  const response = await handler(
    {httpMethod: 'POST'} as any,
    {} as any
  );

  const statusCode = response?.statusCode || 500;
  const body = response?.body || '';

  console.log(`[firehose:cron:run] status=${statusCode}`);
  if (body) {
    console.log(body);
  }

  if (statusCode >= 400) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[firehose:cron:run] failed', error?.message || error);
  process.exit(1);
});
