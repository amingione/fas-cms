import type { Handler } from '@netlify/functions';
import { runMerchantFeedUpload } from '../../scripts/merchant/upload-google-merchant-feed';

export const config = {
  // Run daily at 9:00 UTC
  schedule: '0 9 * * *'
};

export const handler: Handler = async () => {
  try {
    const result = await runMerchantFeedUpload();
    const statusCode = result.uploadedViaApi || result.uploadedViaSftp ? 200 : 500;

    return {
      statusCode,
      body: JSON.stringify({
        rows: result.rows,
        uploadedViaApi: result.uploadedViaApi,
        uploadedViaSftp: result.uploadedViaSftp,
        localPath: result.localPath
      })
    };
  } catch (error: any) {
    console.error('[merchant-feed-upload-cron] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to upload merchant feed' }) };
  }
};

export default { handler, config };
