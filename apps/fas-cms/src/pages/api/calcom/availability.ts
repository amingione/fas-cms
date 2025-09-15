import type { NextApiRequest, NextApiResponse } from 'next';
import { getAvailability } from '../../../lib/calcom';

interface AvailabilityData {
  // Define expected structure; adjust fields as needed
  availableTimes: string[];
  timezone?: string;
}

const CALCOM_API_KEY = process.env.CALCOM_API_KEY;
const cache = new Map<string, AvailabilityData>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { username, date, token } = req.query;

  // Validate presence
  if (!username || !date) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required query parameters: username and date.'
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid date format. Use YYYY-MM-DD.'
    });
  }

  // Optional token-based auth
  if (CALCOM_API_KEY && token !== CALCOM_API_KEY) {
    return res.status(403).json({
      status: 'error',
      message: 'Unauthorized. Invalid API token.'
    });
  }

  const cacheKey = `${username}:${date}`;
  if (cache.has(cacheKey)) {
    return res.status(200).json({
      status: 'success',
      data: cache.get(cacheKey),
      cached: true
    });
  }

  try {
    const availability = await getAvailability(username as string, date as string);
    cache.set(cacheKey, availability);

    res.status(200).json({
      status: 'success',
      data: availability,
      cached: false
    });
  } catch (error) {
    console.error('Failed to fetch Cal.com availability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve availability from Cal.com.'
    });
  }
}
