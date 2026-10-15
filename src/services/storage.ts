import { SessionRecord, ClientProfile } from '../types';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../data/initialData';

const SESSIONS_STORAGE_KEY = 'physio_sessions_db_v2';
const CLIENTS_STORAGE_KEY = 'physio_clients_db_v2';

/**
 * Normalizes Arabic string to assist matching (e.g., alef with hamza, taa marbuta)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export const StorageService = {
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
  },

  saveSessions(sessions: SessionRecord[]): void {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Failed to save sessions to localStorage:', err);
    }
  },

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
  },

  saveClients(clients: ClientProfile[]): void {
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    } catch (err) {
      console.error('Failed to save clients to localStorage:', err);
    }
  },

  /**
   * Adds a new session, enforcing anti-duplication rules:
   * A session is considered duplicate if the same client has a session on the exact same date and time.
   */
  addSession(
    session: Omit<SessionRecord, 'id' | 'createdAt'>
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
      id: `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...sessions];
    this.saveSessions(updatedSessions);

    // Sync client record
    this.ensureClientRecord(newSession);

    return { success: true, session: newSession };
  },

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
    this.saveSessions(sessions);
    return { success: true };
  },

  deleteSession(id: string): boolean {
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length !== sessions.length) {
      this.saveSessions(filtered);
      return true;
    }
    return false;
  },

  togglePaymentStatus(id: string): SessionRecord | null {
    const sessions = this.getSessions();
    const target = sessions.find((s) => s.id === id);
    if (!target) return null;

    target.paymentStatus = target.paymentStatus === 'paid' ? 'pending' : 'paid';
    this.saveSessions(sessions);
    return target;
  },

  /**
   * Resets database back to the pristine 68 image records
   */
  resetToDefault(): void {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SESSIONS));
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(INITIAL_CLIENTS));
  },

  /**
   * Ensures a client exists in client directory when adding session
   */
  ensureClientRecord(session: SessionRecord): void {
    const clients = this.getClients();
    const existing = clients.find(
      (c) => normalizeArabic(c.name) === normalizeArabic(session.clientName)
    );

    if (!existing) {
      const newClient: ClientProfile = {
        id: `cli-${Date.now()}`,
        name: session.clientName,
        phone: session.clientPhone || 'بدون هاتف',
        primaryCondition: session.condition,
        notes: session.notes,
        firstVisitDate: session.attendanceDate,
        lastVisitDate: session.attendanceDate,
      };
      this.saveClients([...clients, newClient]);
    } else {
      // update phone if it was 'بدون هاتف' and now has a phone
      if (existing.phone === 'بدون هاتف' && session.clientPhone && session.clientPhone !== 'بدون هاتف') {
        existing.phone = session.clientPhone;
      }
      if (session.attendanceDate > existing.lastVisitDate) {
        existing.lastVisitDate = session.attendanceDate;
      }
      if (session.attendanceDate < existing.firstVisitDate) {
        existing.firstVisitDate = session.attendanceDate;
      }
      this.saveClients(clients);
    }
  },
};
