import { SessionRecord, ClientProfile } from '../types';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../data/initialData';

const SESSIONS_STORAGE_KEY = 'physio_sessions_db_v2';
const CLIENTS_STORAGE_KEY = 'physio_clients_db_v2';

/**
 * Normalizes Arabic string to assist matching (e.g., alef with hamza, taa marbuta, spaces after Abd/Abu, diacritics)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic tashkeel (diacritics: fatha, damma, kasra, tanween, sukoon)
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/[\-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

type StorageListener = (sessions: SessionRecord[], clients: ClientProfile[]) => void;

class StorageServiceClass {
  private listeners: Set<StorageListener> = new Set();
  private isFetching = false;

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(sessions: SessionRecord[], clients: ClientProfile[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(sessions, clients);
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    });
  }

  /**
   * Syncs with central server database (ensures changes appear across all devices: PC, Mobile, etc.)
   */
  async fetchRemoteData(): Promise<{ sessions: SessionRecord[]; clients: ClientProfile[] } | null> {
    if (this.isFetching) return null;
    this.isFetching = true;

    try {
      const res = await fetch('/api/data', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.sessions) && Array.isArray(data.clients)) {
          this.saveSessions(data.sessions, false);
          this.saveClients(data.clients, false);
          this.notify(data.sessions, data.clients);
          return { sessions: data.sessions, clients: data.clients };
        }
      }
    } catch (err) {
      console.warn('API sync failed, using local offline storage:', err);
    } finally {
      this.isFetching = false;
    }
    return null;
  }

  getSessions(): SessionRecord[] {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!data) {
        // Initialize with verified 68 records
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SESSIONS));
        return INITIAL_SESSIONS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SESSIONS));
        return INITIAL_SESSIONS;
      }
      return parsed;
    } catch {
      return INITIAL_SESSIONS;
    }
  }

  saveSessions(sessions: SessionRecord[], triggerNotify: boolean = true): void {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      if (triggerNotify) {
        this.notify(sessions, this.getClients());
      }
    } catch (err) {
      console.error('Failed to save sessions to localStorage:', err);
    }
  }

  getClients(): ClientProfile[] {
    try {
      const data = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
        return INITIAL_CLIENTS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
        return INITIAL_CLIENTS;
      }
      return parsed;
    } catch {
      return INITIAL_CLIENTS;
    }
  }

  saveClients(clients: ClientProfile[], triggerNotify: boolean = true): void {
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
      if (triggerNotify) {
        this.notify(this.getSessions(), clients);
      }
    } catch (err) {
      console.error('Failed to save clients to localStorage:', err);
    }
  }

  /**
   * Adds a new session, enforcing anti-duplication rules and syncing with backend server
   */
  addSession(
    session: Omit<SessionRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): { success: boolean; session?: SessionRecord; error?: string } {
    const sessions = this.getSessions();

    const isDuplicate = sessions.some(
      (s) =>
        normalizeArabic(s.clientName) === normalizeArabic(session.clientName) &&
        s.attendanceDate === session.attendanceDate &&
        s.attendanceTime === session.attendanceTime
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `يوجد بالفعل جلسة مسجلة لنفس العميل (${session.clientName}) في هذا التاريخ (${session.attendanceDate}) والوقت (${session.attendanceTime}). تم منع التكرار.`,
      };
    }

    const newSession: SessionRecord = {
      ...session,
      id: session.id || `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: session.createdAt || new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...sessions];
    this.saveSessions(updatedSessions, false);

    // Sync client record locally
    const updatedClients = this.ensureClientRecord(newSession);
    this.notify(updatedSessions, updatedClients);

    // Send to central server database for cross-device persistence
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data && data.sessions && data.clients) {
            this.saveSessions(data.sessions, false);
            this.saveClients(data.clients, false);
            this.notify(data.sessions, data.clients);
          }
        }
      })
      .catch((err) => {
        console.warn('Background sync to server failed, data is safe locally:', err);
      });

    return { success: true, session: newSession };
  }

  updateSession(updated: SessionRecord): { success: boolean; error?: string } {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === updated.id);
    if (index === -1) {
      return { success: false, error: 'السجل غير موجود' };
    }

    // Check for duplicate clash with other sessions
    const conflict = sessions.some(
      (s) =>
        s.id !== updated.id &&
        normalizeArabic(s.clientName) === normalizeArabic(updated.clientName) &&
        s.attendanceDate === updated.attendanceDate &&
        s.attendanceTime === updated.attendanceTime
    );

    if (conflict) {
      return {
        success: false,
        error: `تعديل مرفوض: يوجد جلسة أخرى لنفس العميل في هذا التوقيت (${updated.attendanceDate} ${updated.attendanceTime}).`,
      };
    }

    sessions[index] = updated;
    this.saveSessions(sessions, false);

    const updatedClients = this.ensureClientRecord(updated);
    this.notify(sessions, updatedClients);

    // Sync to server
    fetch(`/api/sessions/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data && data.sessions && data.clients) {
            this.saveSessions(data.sessions, false);
            this.saveClients(data.clients, false);
            this.notify(data.sessions, data.clients);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend update sync failed:', err);
      });

    return { success: true };
  }

  deleteSession(id: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length !== sessions.length) {
      this.saveSessions(filtered, false);
      const clients = this.getClients();
      this.notify(filtered, clients);

      fetch(`/api/sessions/${id}`, { method: 'DELETE' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data && data.sessions && data.clients) {
              this.saveSessions(data.sessions, false);
              this.saveClients(data.clients, false);
              this.notify(data.sessions, data.clients);
            }
          }
        })
        .catch((err) => {
          console.warn('Backend delete sync failed:', err);
        });
      return true;
    }
    return false;
  }

  togglePaymentStatus(id: string): SessionRecord | null {
    const sessions = this.getSessions();
    const target = sessions.find((s) => s.id === id);
    if (!target) return null;

    target.paymentStatus = target.paymentStatus === 'paid' ? 'pending' : 'paid';
    this.saveSessions(sessions, false);
    const clients = this.getClients();
    this.notify(sessions, clients);

    fetch(`/api/sessions/${id}/toggle-payment`, { method: 'PATCH' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data && data.sessions && data.clients) {
            this.saveSessions(data.sessions, false);
            this.saveClients(data.clients, false);
            this.notify(data.sessions, data.clients);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend toggle payment sync failed:', err);
      });

    return target;
  }

  /**
   * Resets database back to the pristine 68 image records across all devices
   */
  resetToDefault(): void {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SESSIONS));
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
    this.notify(INITIAL_SESSIONS, INITIAL_CLIENTS);

    fetch('/api/reset', { method: 'POST' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data && data.sessions && data.clients) {
            this.saveSessions(data.sessions, false);
            this.saveClients(data.clients, false);
            this.notify(data.sessions, data.clients);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend reset sync failed:', err);
      });
  }

  /**
   * Ensures a client exists in client directory when adding or updating session
   */
  ensureClientRecord(session: SessionRecord): ClientProfile[] {
    const clients = this.getClients();
    const existing = clients.find(
      (c) => normalizeArabic(c.name) === normalizeArabic(session.clientName)
    );

    if (!existing) {
      const newClient: ClientProfile = {
        id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: session.clientName,
        phone: session.clientPhone || 'بدون هاتف',
        primaryCondition: session.condition,
        notes: session.notes,
        firstVisitDate: session.attendanceDate,
        lastVisitDate: session.attendanceDate,
      };
      const updated = [newClient, ...clients];
      this.saveClients(updated, false);
      return updated;
    } else {
      let changed = false;
      // update phone if it was 'بدون هاتف' or missing and session has phone
      if (
        (existing.phone === 'بدون هاتف' || !existing.phone) &&
        session.clientPhone &&
        session.clientPhone !== 'بدون هاتف'
      ) {
        existing.phone = session.clientPhone;
        changed = true;
      }
      if (!existing.lastVisitDate || session.attendanceDate > existing.lastVisitDate) {
        existing.lastVisitDate = session.attendanceDate;
        changed = true;
      }
      if (!existing.firstVisitDate || session.attendanceDate < existing.firstVisitDate) {
        existing.firstVisitDate = session.attendanceDate;
        changed = true;
      }
      if (session.condition && !existing.primaryCondition) {
        existing.primaryCondition = session.condition;
        changed = true;
      }
      if (changed) {
        this.saveClients(clients, false);
      }
      return clients;
    }
  }
}

export const StorageService = new StorageServiceClass();
