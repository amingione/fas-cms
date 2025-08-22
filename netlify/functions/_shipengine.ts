import fetch from 'node-fetch';
const BASE = 'https://api.shipengine.com/v1';
const KEY = process.env.SHIPENGINE_API_KEY!;

export async function se(path: string, init: any = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'API-Key': KEY,
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
