import { google, type analyticsdata_v1beta } from 'googleapis';

export interface AnalyticsSummary {
  sessions: number;
  pageviews: number;
  averageSessionDuration: number;
  engagementRate: number;
  startDate: string;
  endDate: string;
  available: boolean;
  message?: string;
}

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

const readEnv = (key: string) =>
  process.env[key] ?? (import.meta.env ? (import.meta.env as Record<string, string | undefined>)[key] : undefined);

export async function fetchAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const propertyId = readEnv('GOOGLE_ANALYTICS_PROPERTY_ID');
  const clientEmail = readEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKeyRaw = readEnv('GOOGLE_SERVICE_ACCOUNT_KEY');

  if (!propertyId || !clientEmail || !privateKeyRaw) {
    return {
      sessions: 0,
      pageviews: 0,
      averageSessionDuration: 0,
      engagementRate: 0,
      startDate: '',
      endDate: '',
      available: false,
      message: 'Google Analytics credentials are not configured.'
    };
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES
    });
    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth
    });

    const params: analyticsdata_v1beta.Params$Resource$Properties$Runreport = {
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10)
          }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' }
        ]
      }
    };

    const { data } = await analyticsData.properties.runReport(params);

    const row = data.rows?.[0];
    const values = row?.metricValues ?? [];

    const summary: AnalyticsSummary = {
      sessions: Number(values[0]?.value ?? 0),
      pageviews: Number(values[1]?.value ?? 0),
      averageSessionDuration: Number(values[2]?.value ?? 0),
      engagementRate: Number(values[3]?.value ?? 0) * 100,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      available: true
    };

    return summary;
  } catch (error) {
    console.error('[analytics] Failed to read Google Analytics metrics', error);
    return {
      sessions: 0,
      pageviews: 0,
      averageSessionDuration: 0,
      engagementRate: 0,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      available: false,
      message: (error as Error).message
    };
  }
}
