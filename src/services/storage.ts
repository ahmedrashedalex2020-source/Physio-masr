import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SessionRecord, ClientProfile } from '../types';
import { INITIAL_SESSIONS, INITIAL_CLIENTS } from '../data/initialData';

// Clear legacy local storage records to guarantee 100% reliance on the cloud database
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

/**
 * Sanitizes a SessionRecord to strictly adhere to firebase-blueprint.json & firestore.rules
 * (no undefined values, strict string maxLength and number bounds)
 */
function sanitizeSessionForFirestore(session: SessionRecord): SessionRecord {
  const cleanId = String(session.id || `sess-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 128);

  const basePrice = Number.isFinite(Number(session.basePrice))
    ? Math.max(0, Math.min(1000000, Number(session.basePrice)))
    : 300;
  const totalPrice = Number.isFinite(Number(session.totalPrice))
    ? Math.max(0, Math.min(1000000, Number(session.totalPrice)))
    : basePrice;

  const paymentStatus = ['pending', 'paid', 'cancelled'].includes(session.paymentStatus)
    ? session.paymentStatus
    : 'pending';
  const paymentMethod = ['cash', 'bank_transfer', 'credit_card'].includes(session.paymentMethod)
    ? session.paymentMethod
    : 'cash';

  const sanitized: SessionRecord = {
    id: cleanId,
    clientName: String(session.clientName || 'عميل').trim().slice(0, 200),
    clientPhone: String(session.clientPhone || 'بدون هاتف').trim().slice(0, 50),
    condition: String(session.condition || 'تأهيل وعلاج طبيعي').trim().slice(0, 300),
    attendanceDate: String(session.attendanceDate || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20),
    attendanceTime: String(session.attendanceTime || '10:00').trim().slice(0, 20),
    basePrice,
    totalPrice,
    priceDetails: String(session.priceDetails || `أساسي: ${totalPrice} جنيه`).slice(0, 200),
    paymentStatus,
    paymentMethod,
    createdAt: String(session.createdAt || new Date().toISOString()).slice(0, 64),
  };

  if (session.notes !== undefined && session.notes !== null && String(session.notes).trim() !== '') {
    sanitized.notes = String(session.notes).trim().slice(0, 1000);
  }

  return sanitized;
}

/**
 * Sanitizes a ClientProfile to strictly adhere to firebase-blueprint.json & firestore.rules
 */
function sanitizeClientForFirestore(client: ClientProfile): ClientProfile {
  const cleanId = String(client.id || `cli-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 128);

  const sanitized: ClientProfile = {
    id: cleanId,
    name: String(client.name || 'عميل').trim().slice(0, 200),
    phone: String(client.phone || 'بدون هاتف').trim().slice(0, 50),
    primaryCondition: String(client.primaryCondition || 'تأهيل وعلاج طبيعي').trim().slice(0, 300),
    firstVisitDate: String(client.firstVisitDate || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20),
    lastVisitDate: String(client.lastVisitDate || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20),
  };

  if (client.notes !== undefined && client.notes !== null && String(client.notes).trim() !== '') {
    sanitized.notes = String(client.notes).trim().slice(0, 1000);
  }

  return sanitized;
}

function sortSessionsList(list: SessionRecord[]): SessionRecord[] {
  return [...list].sort((a, b) => {
    // Keep sess-001 .. sess-068 in their natural order or sort newly added sessions on top
    const aIsInitial = /^sess-0\d\d$/.test(a.id);
    const bIsInitial = /^sess-0\d\d$/.test(b.id);
    if (!aIsInitial && bIsInitial) return -1;
    if (aIsInitial && !bIsInitial) return 1;
    if (!aIsInitial && !bIsInitial) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }
    return a.id.localeCompare(b.id);
  });
}

function sortClientsList(list: ClientProfile[]): ClientProfile[] {
  return [...list].sort((a, b) => a.id.localeCompare(b.id));
}

type StorageListener = (sessions: SessionRecord[], clients: ClientProfile[]) => void;
type SyncStatusListener = (status: 'synced' | 'syncing' | 'offline') => void;

class StorageServiceClass {
  private listeners: Set<StorageListener> = new Set();
  private statusListeners: Set<SyncStatusListener> = new Set();
  private sessions: SessionRecord[] = INITIAL_SESSIONS;
  private clients: ClientProfile[] = INITIAL_CLIENTS;
  private lastSessionsHash = '';
  private lastClientsHash = '';
  private isInitialized = false;
  private isSeeding = false;
  private syncStatus: 'synced' | 'syncing' | 'offline' = 'synced';

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    this.ensureRealtimeListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.syncStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: 'synced' | 'syncing' | 'offline'): void {
    if (this.syncStatus === status) return;
    this.syncStatus = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    });
  }

  private notifyIfChanged(force = false): void {
    const sessionsHash = JSON.stringify(this.sessions);
    const clientsHash = JSON.stringify(this.clients);

    if (!force && sessionsHash === this.lastSessionsHash && clientsHash === this.lastClientsHash) {
      return;
    }

    this.lastSessionsHash = sessionsHash;
    this.lastClientsHash = clientsHash;

    this.listeners.forEach((listener) => {
      try {
        listener(this.sessions, this.clients);
      } catch (err) {
        console.error('Error in storage listener:', err);
      }
    });
  }

  /**
   * Initializes one-time cloud seeding (if empty) and attaches silent real-time onSnapshot listeners
   */
  private async ensureRealtimeListeners(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      await this.seedInitialDataIfNeeded();
    } catch (err) {
      console.error('Initial seed check warning:', err);
    }

    // Listen to sessions collection in real time (silent event-driven updates only when documents change)
    onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        if (this.isSeeding) return;
        if (snapshot.empty && this.sessions.length > 0 && !this.lastSessionsHash) {
          return;
        }
        const loadedSessions: SessionRecord[] = [];
        snapshot.forEach((docSnap) => {
          loadedSessions.push(docSnap.data() as SessionRecord);
        });
        if (loadedSessions.length > 0) {
          this.sessions = sortSessionsList(loadedSessions);
          this.notifyIfChanged();
        }
        this.setStatus('synced');
      },
      (error) => {
        this.setStatus('offline');
        try {
          handleFirestoreError(error, OperationType.LIST, 'sessions');
        } catch {
          // Handled and logged by handleFirestoreError
        }
      }
    );

    // Listen to clients collection in real time
    onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        if (this.isSeeding) return;
        const loadedClients: ClientProfile[] = [];
        snapshot.forEach((docSnap) => {
          loadedClients.push(docSnap.data() as ClientProfile);
        });
        if (loadedClients.length > 0) {
          this.clients = sortClientsList(loadedClients);
          this.notifyIfChanged();
        }
        this.setStatus('synced');
      },
      (error) => {
        this.setStatus('offline');
        try {
          handleFirestoreError(error, OperationType.LIST, 'clients');
        } catch {
          // Handled and logged by handleFirestoreError
        }
      }
    );
  }

  /**
   * Seeds the 68 clinic sessions and clients into Firestore only once if the cloud database is empty
   */
  private async seedInitialDataIfNeeded(): Promise<void> {
    if (this.isSeeding) return;

    const metaRef = doc(db, 'sync_meta', 'clinic_seed_v1');
    let metaSnap;
    try {
      metaSnap = await getDoc(metaRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'sync_meta/clinic_seed_v1');
    }

    if (metaSnap && metaSnap.exists() && metaSnap.data()?.seeded === true) {
      return;
    }

    // Check if sessions already exist in Firestore
    let existingSessionsSnap;
    try {
      existingSessionsSnap = await getDocs(collection(db, 'sessions'));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    }

    if (existingSessionsSnap && !existingSessionsSnap.empty) {
      // Already has sessions, just mark sync_meta as seeded
      try {
        await setDoc(metaRef, {
          id: 'clinic_seed_v1',
          seeded: true,
          updatedAt: new Date().toISOString(),
          totalSessions: existingSessionsSnap.size,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'sync_meta/clinic_seed_v1');
      }
      return;
    }

    // Seed initial 68 sessions and clients into Firestore
    this.isSeeding = true;
    try {
      const batch = writeBatch(db);

      for (const session of INITIAL_SESSIONS) {
        const cleanSession = sanitizeSessionForFirestore(session);
        batch.set(doc(db, 'sessions', cleanSession.id), cleanSession);
      }

      for (const client of INITIAL_CLIENTS) {
        const cleanClient = sanitizeClientForFirestore(client);
        batch.set(doc(db, 'clients', cleanClient.id), cleanClient);
      }

      batch.set(metaRef, {
        id: 'clinic_seed_v1',
        seeded: true,
        updatedAt: new Date().toISOString(),
        totalSessions: INITIAL_SESSIONS.length,
      });

      await batch.commit();
      this.sessions = sortSessionsList(INITIAL_SESSIONS);
      this.clients = sortClientsList(INITIAL_CLIENTS);
      this.notifyIfChanged(true);
      this.setStatus('synced');
    } catch (error) {
      this.setStatus('offline');
      handleFirestoreError(error, OperationType.WRITE, 'sessions');
    } finally {
      this.isSeeding = false;
    }
  }

  /**
   * Fetches latest authoritative data directly from Firebase Firestore on manual request
   */
  async fetchRemoteData(): Promise<{ sessions: SessionRecord[]; clients: ClientProfile[] } | null> {
    try {
      await this.seedInitialDataIfNeeded();

      const [sessionsSnap, clientsSnap] = await Promise.all([
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'clients')),
      ]);

      const loadedSessions: SessionRecord[] = [];
      sessionsSnap.forEach((d) => loadedSessions.push(d.data() as SessionRecord));

      const loadedClients: ClientProfile[] = [];
      clientsSnap.forEach((d) => loadedClients.push(d.data() as ClientProfile));

      if (loadedSessions.length > 0) {
        this.sessions = sortSessionsList(loadedSessions);
      }
      if (loadedClients.length > 0) {
        this.clients = sortClientsList(loadedClients);
      }

      this.notifyIfChanged();
      this.setStatus('synced');
      return { sessions: this.sessions, clients: this.clients };
    } catch (err) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.GET, 'sessions');
      } catch {
        // Logged via handleFirestoreError
      }
      return null;
    }
  }

  getSessions(): SessionRecord[] {
    return this.sessions;
  }

  getClients(): ClientProfile[] {
    return this.clients;
  }

  /**
   * Adds a new session directly to Firebase Firestore (enforces anti-duplication and atomic client sync)
   */
  async addSession(
    session: Omit<SessionRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<{ success: boolean; session?: SessionRecord; error?: string }> {
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

    const rawNewSession: SessionRecord = {
      ...session,
      id: session.id || `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: session.createdAt || new Date().toISOString(),
    };

    const newSession = sanitizeSessionForFirestore(rawNewSession);
    const updatedClient = this.prepareUpdatedClientRecord(newSession);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sessions', newSession.id), newSession);
      batch.set(doc(db, 'clients', updatedClient.id), updatedClient);
      await batch.commit();

      // Immediate local state update before snapshot echo
      this.sessions = sortSessionsList([
        newSession,
        ...this.sessions.filter((s) => s.id !== newSession.id),
      ]);
      const existingClientIdx = this.clients.findIndex((c) => c.id === updatedClient.id);
      if (existingClientIdx !== -1) {
        const nextClients = [...this.clients];
        nextClients[existingClientIdx] = updatedClient;
        this.clients = nextClients;
      } else {
        this.clients = [updatedClient, ...this.clients];
      }

      this.notifyIfChanged(true);
      this.setStatus('synced');
      return { success: true, session: newSession };
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${newSession.id}`);
      } catch {
        // Logged via handleFirestoreError
      }
      return {
        success: false,
        error: 'فشل حفظ الجلسة في قاعدة البيانات السحابية. يرجى التحقق من اتصال الإنترنت.',
      };
    }
  }

  /**
   * Updates an existing session directly in Firebase Firestore
   */
  async updateSession(updated: SessionRecord): Promise<{ success: boolean; error?: string }> {
    const existing = this.sessions.find((s) => s.id === updated.id);
    if (!existing) {
      return { success: false, error: 'السجل المطلوب تعديله غير موجود.' };
    }

    const conflict = this.sessions.some(
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

    // Preserve immutable createdAt and id
    const sanitized = sanitizeSessionForFirestore({
      ...updated,
      id: existing.id,
      createdAt: existing.createdAt,
    });

    const updatedClient = this.prepareUpdatedClientRecord(sanitized);

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'sessions', sanitized.id), sanitized);
      batch.set(doc(db, 'clients', updatedClient.id), updatedClient);
      await batch.commit();

      this.sessions = this.sessions.map((s) => (s.id === sanitized.id ? sanitized : s));
      const existingClientIdx = this.clients.findIndex((c) => c.id === updatedClient.id);
      if (existingClientIdx !== -1) {
        const nextClients = [...this.clients];
        nextClients[existingClientIdx] = updatedClient;
        this.clients = nextClients;
      } else {
        this.clients = [updatedClient, ...this.clients];
      }

      this.notifyIfChanged(true);
      this.setStatus('synced');
      return { success: true };
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `sessions/${sanitized.id}`);
      } catch {
        // Logged
      }
      return {
        success: false,
        error: 'فشل تحديث بيانات الجلسة في قاعدة البيانات السحابية.',
      };
    }
  }

  /**
   * Deletes a session directly from Firebase Firestore
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'sessions', id));
      this.sessions = this.sessions.filter((s) => s.id !== id);
      this.notifyIfChanged(true);
      this.setStatus('synced');
      return true;
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.DELETE, `sessions/${id}`);
      } catch {
        // Logged
      }
      return false;
    }
  }

  /**
   * Toggles payment status directly in Firebase Firestore
   */
  async togglePaymentStatus(id: string): Promise<SessionRecord | null> {
    const existing = this.sessions.find((s) => s.id === id);
    if (!existing) return null;

    const newStatus = existing.paymentStatus === 'paid' ? 'pending' : 'paid';
    const updatedSession: SessionRecord = {
      ...existing,
      paymentStatus: newStatus,
    };

    try {
      await updateDoc(doc(db, 'sessions', id), {
        paymentStatus: newStatus,
      });

      this.sessions = this.sessions.map((s) => (s.id === id ? updatedSession : s));
      this.notifyIfChanged(true);
      this.setStatus('synced');
      return updatedSession;
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `sessions/${id}`);
      } catch {
        // Logged
      }
      return null;
    }
  }

  /**
   * Resets database in Firebase Firestore to the pristine 68 records
   */
  async resetToDefault(): Promise<boolean> {
    this.isSeeding = true;
    try {
      const [existingSessionsSnap, existingClientsSnap] = await Promise.all([
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'clients')),
      ]);

      const batch = writeBatch(db);

      // Delete any non-initial sessions
      const initialSessionIds = new Set(INITIAL_SESSIONS.map((s) => s.id));
      existingSessionsSnap.forEach((docSnap) => {
        if (!initialSessionIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      // Delete any non-initial clients
      const initialClientIds = new Set(INITIAL_CLIENTS.map((c) => c.id));
      existingClientsSnap.forEach((docSnap) => {
        if (!initialClientIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      // Restore all 68 sessions and clients
      for (const session of INITIAL_SESSIONS) {
        const cleanSession = sanitizeSessionForFirestore(session);
        batch.set(doc(db, 'sessions', cleanSession.id), cleanSession);
      }

      for (const client of INITIAL_CLIENTS) {
        const cleanClient = sanitizeClientForFirestore(client);
        batch.set(doc(db, 'clients', cleanClient.id), cleanClient);
      }

      batch.set(doc(db, 'sync_meta', 'clinic_seed_v1'), {
        id: 'clinic_seed_v1',
        seeded: true,
        updatedAt: new Date().toISOString(),
        totalSessions: INITIAL_SESSIONS.length,
      });

      await batch.commit();

      this.sessions = sortSessionsList(INITIAL_SESSIONS);
      this.clients = sortClientsList(INITIAL_CLIENTS);
      this.notifyIfChanged(true);
      this.setStatus('synced');
      return true;
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.WRITE, 'sessions');
      } catch {
        // Logged
      }
      return false;
    } finally {
      this.isSeeding = false;
    }
  }

  /**
   * Builds a sanitized ClientProfile from a new/updated session
   */
  private prepareUpdatedClientRecord(session: SessionRecord): ClientProfile {
    const existing = this.clients.find(
      (c) => normalizeArabic(c.name) === normalizeArabic(session.clientName)
    );

    if (!existing) {
      return sanitizeClientForFirestore({
        id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: session.clientName,
        phone: session.clientPhone || 'بدون هاتف',
        primaryCondition: session.condition,
        notes: session.notes,
        firstVisitDate: session.attendanceDate,
        lastVisitDate: session.attendanceDate,
      });
    }

    const updatedPhone =
      (existing.phone === 'بدون هاتف' || !existing.phone) &&
      session.clientPhone &&
      session.clientPhone !== 'بدون هاتف'
        ? session.clientPhone
        : existing.phone;

    const firstVisitDate =
      !existing.firstVisitDate || session.attendanceDate < existing.firstVisitDate
        ? session.attendanceDate
        : existing.firstVisitDate;

    const lastVisitDate =
      !existing.lastVisitDate || session.attendanceDate > existing.lastVisitDate
        ? session.attendanceDate
        : existing.lastVisitDate;

    return sanitizeClientForFirestore({
      ...existing,
      phone: updatedPhone,
      primaryCondition: existing.primaryCondition || session.condition,
      firstVisitDate,
      lastVisitDate,
    });
  }
}

export const StorageService = new StorageServiceClass();
