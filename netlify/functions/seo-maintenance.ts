import type { Handler } from '@netlify/functions';
import { optimizeImages } from '../../scripts/seo/optimizeImages';
import { checkMeta } from '../../scripts/seo/checkMeta';
import { auditLinks } from '../../scripts/seo/auditLinks';

export const config = {
  schedule: '0 3 * * 0'
};

export const handler: Handler = async () => {
  try {
    const [optimized, metaResults, brokenLinks] = await Promise.all([
      optimizeImages(),
      checkMeta(),
      auditLinks()
    ]);

    const summary = {
      optimizedImages: optimized.optimized.length,
      lazyLoadedDocuments: optimized.lazyUpdated,
      pagesMissingMeta: metaResults.length,
      brokenLinks: brokenLinks.length
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, summary })
    };
  } catch (error) {
    console.error('[seo-maintenance] Failed to execute weekly SEO maintenance', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: (error as Error).message })
    };
  }
};
