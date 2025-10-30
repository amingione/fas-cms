import { sanityFetch } from './sanityFetch';

export interface RankingMetricPoint {
  date: string;
  keyword?: string;
  position?: number;
  clicks?: number;
  impressions?: number;
}

export interface SeoMetricsDocument {
  metrics?: RankingMetricPoint[];
  notes?: string;
  updatedAt?: string;
}

export async function fetchSeoMetrics(limit = 30): Promise<RankingMetricPoint[]> {
  try {
    const data = await sanityFetch<{ metrics?: RankingMetricPoint[] }>({
      query: `*[_type == "seoMetrics"] | order(_updatedAt desc)[0]{ metrics[] | order(date desc)[0...$limit] }`,
      params: { limit }
    });
    return Array.isArray(data?.metrics) ? data.metrics : [];
  } catch (error) {
    console.error('[seoMetrics] Failed to fetch metrics from Sanity', error);
    return [];
  }
}
