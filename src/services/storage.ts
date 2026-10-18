import { SessionRecord, ClientProfile } from '../types';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../data/initialData';

// Clear legacy local storage records to guarantee 100% reliance on the server database
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('physio_sessions_db_v2');
    localStorage.removeItem('physio_clients_db_v2');
    localStorage.removeItem('physio_sessions_db');
    localStorage.removeItem('physio_clients_db');
  }
} catch {
  // Ignore in non-browser environments
}

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
  private sessions: SessionRecord[] = INITIAL_SESSIONS;
  private clients: ClientProfile[] = INITIAL_CLIENTS;
  private fetchPromise: Promise<{ sessions: SessionRecord[]; clients: ClientProfile[] } | null> | null = null;

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
   * Fetches latest authoritative data directly from central database (server.ts / /api/data)
   */
  async fetchRemoteData(): Promise<{ sessions: SessionRecord[]; clients: ClientProfile[] } | null> {
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

        const res = await fetch('/api/data', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Accept': 'application/json',
          },
          cache: 'no-store',
          signal: controller?.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            console.warn('Expected JSON from /api/data but received non-JSON content');
            return null;
          }

          const data = await res.json();
          if (data && Array.isArray(data.sessions) && Array.isArray(data.clients)) {
            this.sessions = data.sessions;
            this.clients = data.clients;
            this.notify(this.sessions, this.clients);
            return { sessions: this.sessions, clients: this.clients };
          }
        }
      } catch (err) {
        console.warn('Central database connection issue:', err);
      }
      return null;
    })();

    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  getSessions(): SessionRecord[] {
    return this.sessions;
  }

  getClients(): ClientProfile[] {
    return this.clients;
  }

  /**
   * Adds a new session directly to the central database (enforces anti-duplication and direct DB write)
   */
  async addSession(
    session: Omit<SessionRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<{ success: boolean; session?: SessionRecord; error?: string }> {
    // Client-side quick duplication check
    const isDuplicate = this.sessions.some(
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

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(session),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'فشل حفظ الجلسة في قاعدة البيانات المركزية',
        };
      }

      if (Array.isArray(data.sessions) && Array.isArray(data.clients)) {
        this.sessions = data.sessions;
        this.clients = data.clients;
      } else if (data.session) {
        this.sessions = [data.session, ...this.sessions];
        this.ensureClientRecord(data.session);
      }

      this.notify(this.sessions, this.clients);
      return { success: true, session: data.session };
    } catch (err: any) {
      console.error('Error adding session directly to database:', err);
      return {
        success: false,
        error: 'فشل الاتصال بقاعدة البيانات المركزية. يرجى التأكد من تشغيل السيرفر والاتصال بالشبكة.',
      };
    }
  }

  /**
   * Updates an existing session directly in the database
   */
  async updateSession(updated: SessionRecord): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/sessions/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(updated),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'فشل تحديث بيانات الجلسة في قاعدة البيانات المركزية',
        };
      }

      if (Array.isArray(data.sessions) && Array.isArray(data.clients)) {
        this.sessions = data.sessions;
        this.clients = data.clients;
      } else {
        const index = this.sessions.findIndex((s) => s.id === updated.id);
        if (index !== -1) {
          this.sessions[index] = updated;
        }
        this.ensureClientRecord(updated);
      }

      this.notify(this.sessions, this.clients);
      return { success: true };
    } catch (err: any) {
      console.error('Error updating session in database:', err);
      return {
        success: false,
        error: 'فشل الاتصال بقاعدة البيانات لتحديث الجلسة.',
      };
    }
  }

  /**
   * Deletes a session directly from the database
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (Array.isArray(data.sessions) && Array.isArray(data.clients)) {
          this.sessions = data.sessions;
          this.clients = data.clients;
        } else {
          this.sessions = this.sessions.filter((s) => s.id !== id);
        }
        this.notify(this.sessions, this.clients);
        return true;
      }
    } catch (err) {
      console.error('Error deleting session from database:', err);
    }
    return false;
  }

  /**
   * Toggles payment status directly in the database
   */
  async togglePaymentStatus(id: string): Promise<SessionRecord | null> {
    try {
      const res = await fetch(`/api/sessions/${id}/toggle-payment`, {
        method: 'PATCH',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (Array.isArray(data.sessions) && Array.isArray(data.clients)) {
          this.sessions = data.sessions;
          this.clients = data.clients;
        } else if (data.session) {
          const index = this.sessions.findIndex((s) => s.id === id);
          if (index !== -1) {
            this.sessions[index] = data.session;
          }
        }
        this.notify(this.sessions, this.clients);
        return data.session || this.sessions.find((s) => s.id === id) || null;
      }
    } catch (err) {
      console.error('Error toggling payment status in database:', err);
    }
    return null;
  }

  /**
   * Resets database directly on the server to the pristine 68 records
   */
  async resetToDefault(): Promise<boolean> {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache' },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.sessions = data.sessions;
        this.clients = data.clients;
        this.notify(this.sessions, this.clients);
        return true;
      }
    } catch (err) {
      console.error('Error resetting database:', err);
    }
    return false;
  }

  /**
   * Helper to ensure in-memory client record is updated with new/modified session
   */
  private ensureClientRecord(session: SessionRecord): void {
    const existing = this.clients.find(
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
      this.clients = [newClient, ...this.clients];
    } else {
      if (
        (existing.phone === 'بدون هاتف' || !existing.phone) &&
        session.clientPhone &&
        session.clientPhone !== 'بدون هاتف'
      ) {
        existing.phone = session.clientPhone;
      }
      if (!existing.lastVisitDate || session.attendanceDate > existing.lastVisitDate) {
        existing.lastVisitDate = session.attendanceDate;
      }
      if (!existing.firstVisitDate || session.attendanceDate < existing.firstVisitDate) {
        existing.firstVisitDate = session.attendanceDate;
      }
      if (session.condition && !existing.primaryCondition) {
        existing.primaryCondition = session.condition;
      }
    }
  }
}

export const StorageService = new StorageServiceClass();
