const CALCOM_API_KEY = import.meta.env.CALCOM_API_KEY;

if (!CALCOM_API_KEY) {
  throw new Error('CALCOM_API_KEY is missing from environment variables');
}

export async function fetchAppointments() {
  const response = await fetch('https://api.cal.com/v1/bookings', {
    headers: {
      Authorization: `Bearer ${CALCOM_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.statusText}`);
  }

  return response.json();
}

export async function getAvailability(username: string, date: string) {
  const response = await fetch(`https://api.cal.com/v1/availability/${username}?date=${date}`, {
    headers: {
      Authorization: `Bearer ${CALCOM_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`);
  }

  return response.json();
}
