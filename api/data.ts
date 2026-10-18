import fs from 'fs';
import path from 'path';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../src/data/initialData';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.sessions) && Array.isArray(parsed.clients)) {
        return res.status(200).json({
          success: true,
          sessions: parsed.sessions,
          clients: parsed.clients,
          lastSync: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Error reading database file in api/data:', err);
  }

  return res.status(200).json({
    success: true,
    sessions: INITIAL_SESSIONS,
    clients: INITIAL_CLIENTS,
    lastSync: new Date().toISOString(),
  });
}
