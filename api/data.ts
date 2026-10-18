import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../src/data/initialData';

export default function handler(req: any, res: any) {
  // Set CORS and Cache-Control headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    sessions: INITIAL_SESSIONS,
    clients: INITIAL_CLIENTS,
    lastSync: new Date().toISOString(),
  });
}
