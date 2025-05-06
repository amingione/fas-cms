import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchAppointments } from '../../lib/calcom';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
      return res.status(405).json({
        status: 'error',
        message: 'Method Not Allowed. Only GET is supported on this endpoint.'
      });
    }
    try {
      const appointments = await fetchAppointments();

      res.status(200).json({
        status: 'success',
        source: 'FAS Motorsports Cal.com API',
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      console.error('FAS API: Failed to fetch Cal.com appointments →', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error. Our team is on it.'
      });
    }
  } catch (error) {
    console.error('FAS API: Unexpected error in the handler →', error);
    res.status(500).json({
      status: 'error',
      message: 'Unexpected server error.'
    });
  }
}
