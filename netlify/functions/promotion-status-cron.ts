import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

export const config = { schedule: '0 * * * *' };

export const handler: Handler = async () => {
  try {
    const now = new Date().toISOString();

    const toActivate = await sanity.fetch(
      `*[_type == "promotion" 
      && status == "scheduled"
      && schedule.startDate <= $now
      && (schedule.endDate > $now || !defined(schedule.endDate))
    ]._id`,
      { now }
    );

    for (const id of toActivate || []) {
      await sanity.patch(id).set({ status: 'active', 'schedule.isActive': true }).commit();
    }

    const toComplete = await sanity.fetch(
      `*[_type == "promotion" 
      && status == "active"
      && defined(schedule.endDate)
      && schedule.endDate <= $now
    ]._id`,
      { now }
    );

    for (const id of toComplete || []) {
      await sanity.patch(id).set({ status: 'completed', 'schedule.isActive': false }).commit();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ activated: toActivate?.length || 0, completed: toComplete?.length || 0 })
    };
  } catch (error: any) {
    console.error('[promotion-status-cron] failed', error?.message || error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update promotions' }) };
  }
};

export default { handler, config };
