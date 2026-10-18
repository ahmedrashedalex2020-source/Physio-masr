import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from './src/data/initialData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic tashkeel (diacritics)
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/[\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

interface DatabaseStructure {
  sessions: typeof INITIAL_SESSIONS;
  clients: typeof INITIAL_CLIENTS;
}

function loadDatabase(): DatabaseStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.sessions) && Array.isArray(parsed.clients)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file, using initial data:', err);
  }

  const initialDb: DatabaseStructure = {
    sessions: INITIAL_SESSIONS,
    clients: INITIAL_CLIENTS,
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseStructure): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

let db = loadDatabase();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Full CORS support for Mobile PWA, Webviews, and Cross-Origin clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Prevent aggressive caching of API responses across mobile and desktop
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // API Endpoints
  app.get('/api/data', (_req, res) => {
    res.json({
      success: true,
      sessions: db.sessions,
      clients: db.clients,
      lastSync: new Date().toISOString(),
    });
  });

  app.post('/api/sessions', (req, res) => {
    const sessionData = req.body;
    if (!sessionData || !sessionData.clientName || !sessionData.attendanceDate) {
      return res.status(400).json({ success: false, error: 'بيانات الجلسة غير مكتملة' });
    }

    // Anti-duplication check
    const isDuplicate = db.sessions.some(
      (s) =>
        normalizeArabic(s.clientName) === normalizeArabic(sessionData.clientName) &&
        s.attendanceDate === sessionData.attendanceDate &&
        s.attendanceTime === sessionData.attendanceTime
    );

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: `يوجد بالفعل جلسة مسجلة لنفس العميل (${sessionData.clientName}) في هذا التاريخ (${sessionData.attendanceDate}) والوقت (${sessionData.attendanceTime}). تم منع التكرار.`,
      });
    }

    // Preserve client-sent ID or create new
    const newSession = {
      ...sessionData,
      id: sessionData.id || `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: sessionData.createdAt || new Date().toISOString(),
    };

    db.sessions = [newSession, ...db.sessions];

    // Ensure client record in clients list
    const existingClient = db.clients.find(
      (c) => normalizeArabic(c.name) === normalizeArabic(newSession.clientName)
    );

    if (!existingClient) {
      const newClient = {
        id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: newSession.clientName,
        phone: newSession.clientPhone || 'بدون هاتف',
        primaryCondition: newSession.condition,
        notes: newSession.notes,
        firstVisitDate: newSession.attendanceDate,
        lastVisitDate: newSession.attendanceDate,
      };
      db.clients = [newClient, ...db.clients];
    } else {
      if (
        (existingClient.phone === 'بدون هاتف' || !existingClient.phone) &&
        newSession.clientPhone &&
        newSession.clientPhone !== 'بدون هاتف'
      ) {
        existingClient.phone = newSession.clientPhone;
      }
      if (!existingClient.lastVisitDate || newSession.attendanceDate > existingClient.lastVisitDate) {
        existingClient.lastVisitDate = newSession.attendanceDate;
      }
      if (!existingClient.firstVisitDate || newSession.attendanceDate < existingClient.firstVisitDate) {
        existingClient.firstVisitDate = newSession.attendanceDate;
      }
    }

    saveDatabase(db);
    return res.json({
      success: true,
      session: newSession,
      sessions: db.sessions,
      clients: db.clients,
    });
  });

  app.put('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    const updated = req.body;
    const index = db.sessions.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    }

    // Check conflict
    const conflict = db.sessions.some(
      (s) =>
        s.id !== id &&
        normalizeArabic(s.clientName) === normalizeArabic(updated.clientName) &&
        s.attendanceDate === updated.attendanceDate &&
        s.attendanceTime === updated.attendanceTime
    );

    if (conflict) {
      return res.status(409).json({
        success: false,
        error: `تعديل مرفوض: يوجد جلسة أخرى لنفس العميل في هذا التوقيت (${updated.attendanceDate} ${updated.attendanceTime}).`,
      });
    }

    db.sessions[index] = { ...updated, id };

    // Update client phone if changed
    const client = db.clients.find(
      (c) => normalizeArabic(c.name) === normalizeArabic(updated.clientName)
    );
    if (client && updated.clientPhone && updated.clientPhone !== 'بدون هاتف') {
      client.phone = updated.clientPhone;
    }

    saveDatabase(db);
    return res.json({
      success: true,
      session: db.sessions[index],
      sessions: db.sessions,
      clients: db.clients,
    });
  });

  app.delete('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = db.sessions.length;
    db.sessions = db.sessions.filter((s) => s.id !== id);

    if (db.sessions.length !== initialLen) {
      saveDatabase(db);
      return res.json({
        success: true,
        sessions: db.sessions,
        clients: db.clients,
      });
    }
    return res.status(404).json({ success: false, error: 'السجل غير موجود' });
  });

  app.patch('/api/sessions/:id/toggle-payment', (req, res) => {
    const { id } = req.params;
    const session = db.sessions.find((s) => s.id === id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    }

    session.paymentStatus = session.paymentStatus === 'paid' ? 'pending' : 'paid';
    saveDatabase(db);
    return res.json({
      success: true,
      session,
      sessions: db.sessions,
      clients: db.clients,
    });
  });

  app.post('/api/reset', (_req, res) => {
    db = {
      sessions: INITIAL_SESSIONS,
      clients: INITIAL_CLIENTS,
    };
    saveDatabase(db);
    return res.json({ success: true, sessions: db.sessions, clients: db.clients });
  });

  // Vite middleware in dev or static in prod
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
