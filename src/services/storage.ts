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
  getDocFromServer,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SessionRecord, ClientProfile, MonthlyArchive } from '../types';
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
export function sanitizeSessionForFirestore(session: SessionRecord): SessionRecord {
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

  if (
    session.archiveId !== undefined &&
    session.archiveId !== null &&
    String(session.archiveId).trim() !== ''
  ) {
    sanitized.archiveId = String(session.archiveId).trim().slice(0, 128);
  }

  if (
    session.archiveLabel !== undefined &&
    session.archiveLabel !== null &&
    String(session.archiveLabel).trim() !== ''
  ) {
    sanitized.archiveLabel = String(session.archiveLabel).trim().slice(0, 200);
  }

  return sanitized;
}

/**
 * Sanitizes a ClientProfile to strictly adhere to firebase-blueprint.json & firestore.rules
 */
export function sanitizeClientForFirestore(client: ClientProfile): ClientProfile {
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

/**
 * Sanitizes a MonthlyArchive to strictly adhere to firebase-blueprint.json & firestore.rules
 */
export function sanitizeArchiveForFirestore(archive: MonthlyArchive): MonthlyArchive {
  const cleanId = String(archive.id || `arch-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 128);

  const sanitized: MonthlyArchive = {
    id: cleanId,
    title: String(archive.title || 'تقفيل حساب الشهر').trim().slice(0, 200),
    closedAt: String(archive.closedAt || new Date().toISOString()).slice(0, 64),
    startDate: String(archive.startDate || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20),
    endDate: String(archive.endDate || new Date().toISOString().slice(0, 10))
      .trim()
      .slice(0, 20),
    totalSessions: Math.max(0, Math.min(100000, Number(archive.totalSessions) || 0)),
    totalRevenue: Math.max(0, Math.min(100000000, Number(archive.totalRevenue) || 0)),
    paidRevenue: Math.max(0, Math.min(100000000, Number(archive.paidRevenue) || 0)),
    pendingRevenue: Math.max(0, Math.min(100000000, Number(archive.pendingRevenue) || 0)),
    paidCount: Math.max(0, Math.min(100000, Number(archive.paidCount) || 0)),
    pendingCount: Math.max(0, Math.min(100000, Number(archive.pendingCount) || 0)),
  };

  if (archive.notes !== undefined && archive.notes !== null && String(archive.notes).trim() !== '') {
    sanitized.notes = String(archive.notes).trim().slice(0, 1000);
  }

  return sanitized;
}

function sortSessionsList(list: SessionRecord[]): SessionRecord[] {
  return [...list].sort((a, b) => {
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

function sortArchivesList(list: MonthlyArchive[]): MonthlyArchive[] {
  return [...list].sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
}

export interface DiagnosticCheckResult {
  id: string;
  title: string;
  status: 'passed' | 'warning' | 'failed';
  detail: string;
  latencyMs?: number;
}

type StorageListener = (
  sessions: SessionRecord[],
  clients: ClientProfile[],
  archives: MonthlyArchive[]
) => void;
type SyncStatusListener = (status: 'synced' | 'syncing' | 'offline') => void;

class StorageServiceClass {
  private listeners: Set<StorageListener> = new Set();
  private statusListeners: Set<SyncStatusListener> = new Set();
  private sessions: SessionRecord[] = INITIAL_SESSIONS;
  private clients: ClientProfile[] = INITIAL_CLIENTS;
  private archives: MonthlyArchive[] = [];
  private lastSessionsHash = '';
  private lastClientsHash = '';
  private lastArchivesHash = '';
  private isInitialized = false;
  private isSeeding = false;
  private hasCompletedInitialSeedCheck = false;
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
    const archivesHash = JSON.stringify(this.archives);

    if (
      !force &&
      sessionsHash === this.lastSessionsHash &&
      clientsHash === this.lastClientsHash &&
      archivesHash === this.lastArchivesHash
    ) {
      return;
    }

    this.lastSessionsHash = sessionsHash;
    this.lastClientsHash = clientsHash;
    this.lastArchivesHash = archivesHash;

    this.listeners.forEach((listener) => {
      try {
        listener(this.sessions, this.clients, this.archives);
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
      this.hasCompletedInitialSeedCheck = true;
    } catch (err) {
      console.error('Initial seed check warning:', err);
    }

    // Listen to sessions collection in real time (silent event-driven updates only when documents change)
    onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        if (this.isSeeding) return;
        const loadedSessions: SessionRecord[] = [];
        snapshot.forEach((docSnap) => {
          loadedSessions.push(docSnap.data() as SessionRecord);
        });
        if (loadedSessions.length > 0 || this.hasCompletedInitialSeedCheck) {
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
        if (loadedClients.length > 0 || this.hasCompletedInitialSeedCheck) {
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

    // Listen to monthly_archives collection in real time
    onSnapshot(
      collection(db, 'monthly_archives'),
      (snapshot) => {
        if (this.isSeeding) return;
        const loadedArchives: MonthlyArchive[] = [];
        snapshot.forEach((docSnap) => {
          loadedArchives.push(docSnap.data() as MonthlyArchive);
        });
        this.archives = sortArchivesList(loadedArchives);
        this.notifyIfChanged();
        this.setStatus('synced');
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'monthly_archives');
        } catch {
          // Handled
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
  async fetchRemoteData(): Promise<{
    sessions: SessionRecord[];
    clients: ClientProfile[];
    archives: MonthlyArchive[];
  } | null> {
    try {
      await this.seedInitialDataIfNeeded();

      const [sessionsSnap, clientsSnap, archivesSnap] = await Promise.all([
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'monthly_archives')),
      ]);

      const loadedSessions: SessionRecord[] = [];
      sessionsSnap.forEach((d) => loadedSessions.push(d.data() as SessionRecord));

      const loadedClients: ClientProfile[] = [];
      clientsSnap.forEach((d) => loadedClients.push(d.data() as ClientProfile));

      const loadedArchives: MonthlyArchive[] = [];
      archivesSnap.forEach((d) => loadedArchives.push(d.data() as MonthlyArchive));

      this.sessions = sortSessionsList(loadedSessions);
      this.clients = sortClientsList(loadedClients);
      this.archives = sortArchivesList(loadedArchives);

      this.notifyIfChanged();
      this.setStatus('synced');
      return { sessions: this.sessions, clients: this.clients, archives: this.archives };
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

  getArchives(): MonthlyArchive[] {
    return this.archives;
  }

  /**
   * Closes and archives all currently open (unarchived) sessions into a MonthlyArchive record
   * in Firestore, and resets the current open period to 0 sessions so the new month starts fresh.
   */
  async closeCurrentMonth(
    title: string,
    notes?: string
  ): Promise<{ success: boolean; archive?: MonthlyArchive; error?: string }> {
    const openSessions = this.sessions.filter((s) => !s.archiveId);
    if (openSessions.length === 0) {
      return {
        success: false,
        error: 'لا توجد أي جلسات مفتوحة في الشهر الحالي لتقفيلها وأرشفتها.',
      };
    }

    const trimmedTitle = (title || '').trim() || `أرشيف شهر ${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`;
    const archiveId = `arch-${Date.now()}`;
    const closedAt = new Date().toISOString();

    const sortedDates = openSessions
      .map((s) => s.attendanceDate)
      .filter(Boolean)
      .sort();
    const startDate = sortedDates[0] || closedAt.slice(0, 10);
    const endDate = sortedDates[sortedDates.length - 1] || closedAt.slice(0, 10);

    const paidSessions = openSessions.filter((s) => s.paymentStatus === 'paid');
    const pendingSessions = openSessions.filter((s) => s.paymentStatus === 'pending');

    const totalRevenue = openSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const paidRevenue = paidSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const pendingRevenue = pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

    const newArchive = sanitizeArchiveForFirestore({
      id: archiveId,
      title: trimmedTitle,
      closedAt,
      startDate,
      endDate,
      totalSessions: openSessions.length,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      paidCount: paidSessions.length,
      pendingCount: pendingSessions.length,
      notes,
    });

    this.isSeeding = true;
    try {
      // Save archive and update sessions in chunks (max 400 operations per Firestore batch)
      const CHUNK_SIZE = 400;
      const updatedSessionMap = new Map<string, SessionRecord>();

      for (let i = 0; i < openSessions.length; i += CHUNK_SIZE) {
        const chunk = openSessions.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        if (i === 0) {
          batch.set(doc(db, 'monthly_archives', newArchive.id), newArchive);
        }

        for (const s of chunk) {
          const stamped = sanitizeSessionForFirestore({
            ...s,
            archiveId: newArchive.id,
            archiveLabel: newArchive.title,
          });
          updatedSessionMap.set(stamped.id, stamped);
          batch.set(doc(db, 'sessions', stamped.id), stamped);
        }

        await batch.commit();
      }

      this.sessions = sortSessionsList(
        this.sessions.map((s) => updatedSessionMap.get(s.id) || s)
      );
      this.archives = sortArchivesList([newArchive, ...this.archives]);
      this.notifyIfChanged(true);
      this.setStatus('synced');

      return { success: true, archive: newArchive };
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.WRITE, `monthly_archives/${newArchive.id}`);
      } catch {
        // Logged
      }
      return {
        success: false,
        error: 'تعذر تقفيل الشهر وأرشفته في قاعدة البيانات السحابية. يرجى المحاولة مرة أخرى.',
      };
    } finally {
      this.isSeeding = false;
    }
  }

  /**
   * Reopens a closed monthly archive (removes archiveId/archiveLabel from its sessions and deletes the archive summary)
   */
  async reopenArchive(archiveId: string): Promise<{ success: boolean; error?: string }> {
    const targetArchive = this.archives.find((a) => a.id === archiveId);
    if (!targetArchive) {
      return { success: false, error: 'الأرشيف المطلوب غير موجود.' };
    }

    const archivedSessions = this.sessions.filter((s) => s.archiveId === archiveId);
    this.isSeeding = true;

    try {
      const CHUNK_SIZE = 400;
      const reopenedMap = new Map<string, SessionRecord>();

      if (archivedSessions.length === 0) {
        await deleteDoc(doc(db, 'monthly_archives', archiveId));
      } else {
        for (let i = 0; i < archivedSessions.length; i += CHUNK_SIZE) {
          const chunk = archivedSessions.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);

          if (i === 0) {
            batch.delete(doc(db, 'monthly_archives', archiveId));
          }

          for (const s of chunk) {
            const copy: SessionRecord = { ...s };
            delete copy.archiveId;
            delete copy.archiveLabel;
            const clean = sanitizeSessionForFirestore(copy);
            reopenedMap.set(clean.id, clean);
            batch.set(doc(db, 'sessions', clean.id), clean);
          }

          await batch.commit();
        }
      }

      this.sessions = sortSessionsList(
        this.sessions.map((s) => reopenedMap.get(s.id) || s)
      );
      this.archives = this.archives.filter((a) => a.id !== archiveId);
      this.notifyIfChanged(true);
      this.setStatus('synced');
      return { success: true };
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.WRITE, `monthly_archives/${archiveId}`);
      } catch {
        // Logged
      }
      return {
        success: false,
        error: 'تعذر إعادة فتح الأرشيف في قاعدة البيانات السحابية.',
      };
    } finally {
      this.isSeeding = false;
    }
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

    // Preserve immutable createdAt, id, and existing archive stamps unless explicitly updated
    const sanitized = sanitizeSessionForFirestore({
      ...updated,
      id: existing.id,
      createdAt: existing.createdAt,
      archiveId: updated.archiveId !== undefined ? updated.archiveId : existing.archiveId,
      archiveLabel: updated.archiveLabel !== undefined ? updated.archiveLabel : existing.archiveLabel,
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
   * Deletes a session directly from Firebase Firestore and recalculates client visit dates
   */
  async deleteSession(id: string): Promise<boolean> {
    const targetSession = this.sessions.find((s) => s.id === id);
    try {
      await deleteDoc(doc(db, 'sessions', id));
      this.sessions = this.sessions.filter((s) => s.id !== id);

      if (targetSession) {
        const remainingForClient = this.sessions.filter(
          (s) => normalizeArabic(s.clientName) === normalizeArabic(targetSession.clientName)
        );
        const existingClient = this.clients.find(
          (c) => normalizeArabic(c.name) === normalizeArabic(targetSession.clientName)
        );
        if (existingClient && remainingForClient.length > 0) {
          const dates = remainingForClient.map((s) => s.attendanceDate).sort();
          const updatedClient = sanitizeClientForFirestore({
            ...existingClient,
            firstVisitDate: dates[0],
            lastVisitDate: dates[dates.length - 1],
          });
          await setDoc(doc(db, 'clients', updatedClient.id), updatedClient);
          this.clients = this.clients.map((c) =>
            c.id === updatedClient.id ? updatedClient : c
          );
        }
      }

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
   * Creates or updates a ClientProfile directly in Firebase Firestore
   */
  async saveClient(
    clientInput: Partial<ClientProfile> & { name: string }
  ): Promise<{ success: boolean; client?: ClientProfile; error?: string }> {
    const trimmedName = (clientInput.name || '').trim();
    if (!trimmedName) {
      return { success: false, error: 'يرجى إدخال اسم المريض.' };
    }

    const duplicate = this.clients.find(
      (c) =>
        c.id !== clientInput.id &&
        normalizeArabic(c.name) === normalizeArabic(trimmedName)
    );
    if (duplicate) {
      return {
        success: false,
        error: `يوجد بالفعل ملف مريض مسجل بنفس الاسم (${duplicate.name}).`,
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = clientInput.id
      ? this.clients.find((c) => c.id === clientInput.id)
      : undefined;

    const sanitized = sanitizeClientForFirestore({
      id: existing?.id || clientInput.id || `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmedName,
      phone: clientInput.phone?.trim() || existing?.phone || 'بدون هاتف',
      primaryCondition:
        clientInput.primaryCondition?.trim() ||
        existing?.primaryCondition ||
        'تأهيل خشونة الركبة والمفاصل',
      notes: clientInput.notes !== undefined ? clientInput.notes : existing?.notes,
      firstVisitDate: clientInput.firstVisitDate || existing?.firstVisitDate || today,
      lastVisitDate: clientInput.lastVisitDate || existing?.lastVisitDate || today,
    });

    try {
      await setDoc(doc(db, 'clients', sanitized.id), sanitized);

      const idx = this.clients.findIndex((c) => c.id === sanitized.id);
      if (idx !== -1) {
        const next = [...this.clients];
        next[idx] = sanitized;
        this.clients = sortClientsList(next);
      } else {
        this.clients = sortClientsList([...this.clients, sanitized]);
      }

      this.notifyIfChanged(true);
      this.setStatus('synced');
      return { success: true, client: sanitized };
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.WRITE, `clients/${sanitized.id}`);
      } catch {
        // Logged
      }
      return {
        success: false,
        error: 'تعذر حفظ ملف المريض في قاعدة البيانات السحابية.',
      };
    }
  }

  /**
   * Deletes a client profile from Firebase Firestore
   */
  async deleteClient(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'clients', id));
      this.clients = this.clients.filter((c) => c.id !== id);
      this.notifyIfChanged(true);
      this.setStatus('synced');
      return true;
    } catch (err: unknown) {
      this.setStatus('offline');
      try {
        handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
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
   * Preserves existing createdAt timestamps on existing documents to satisfy immutable field rules
   */
  async resetToDefault(): Promise<boolean> {
    this.isSeeding = true;
    try {
      const [existingSessionsSnap, existingClientsSnap, existingArchivesSnap] = await Promise.all([
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'monthly_archives')),
      ]);

      const batch = writeBatch(db);

      const existingCreatedAtMap = new Map<string, string>();
      const initialSessionIds = new Set(INITIAL_SESSIONS.map((s) => s.id));
      existingSessionsSnap.forEach((docSnap) => {
        if (!initialSessionIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        } else {
          const data = docSnap.data();
          if (data && typeof data.createdAt === 'string') {
            existingCreatedAtMap.set(docSnap.id, data.createdAt);
          }
        }
      });

      const initialClientIds = new Set(INITIAL_CLIENTS.map((c) => c.id));
      existingClientsSnap.forEach((docSnap) => {
        if (!initialClientIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      existingArchivesSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      const restoredSessions: SessionRecord[] = [];
      for (const session of INITIAL_SESSIONS) {
        const preservedCreatedAt = existingCreatedAtMap.get(session.id) || session.createdAt;
        const cleanSession = sanitizeSessionForFirestore({
          ...session,
          createdAt: preservedCreatedAt,
        });
        restoredSessions.push(cleanSession);
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

      this.sessions = sortSessionsList(restoredSessions);
      this.clients = sortClientsList(INITIAL_CLIENTS);
      this.archives = [];
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
   * Executes a comprehensive live diagnostic test suite against Firebase Firestore & local state integrity
   */
  async runDatabaseDiagnostics(): Promise<DiagnosticCheckResult[]> {
    const results: DiagnosticCheckResult[] = [];

    // 1. Test live server connection to Firestore
    const t0 = performance.now();
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      const latency = Math.round(performance.now() - t0);
      results.push({
        id: 'firestore-connection',
        title: 'الاتصال المباشر بسيرفر Firebase Firestore',
        status: 'passed',
        detail: `متصل بنجاح بقاعدة البيانات السحابية الموحدة (زمن الاستجابة: ${latency} مللي ثانية).`,
        latencyMs: latency,
      });
    } catch (err: unknown) {
      results.push({
        id: 'firestore-connection',
        title: 'الاتصال المباشر بسيرفر Firebase Firestore',
        status: 'failed',
        detail: `تعذر الوصول المباشر للسيرفر: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 2. Test full CRUD & Security Rules compliance with a temporary probe session
    const probeId = `probe-diag-${Date.now()}`;
    const tCrud = performance.now();
    try {
      const probeSession = sanitizeSessionForFirestore({
        id: probeId,
        clientName: 'فحص تلقائي للنظام',
        clientPhone: '01000000000',
        condition: 'تأهيل خشونة الركبة والمفاصل',
        notes: 'سجل فحص مؤقت لاختبار القراءة والكتابة والتحديث والحذف',
        attendanceDate: '2026-10-18',
        attendanceTime: '23:59',
        basePrice: 300,
        totalPrice: 300,
        priceDetails: 'أساسي: 300 جنيه',
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        createdAt: new Date().toISOString(),
      });

      await setDoc(doc(db, 'sessions', probeId), probeSession);
      await updateDoc(doc(db, 'sessions', probeId), { paymentStatus: 'paid' });
      const verifySnap = await getDoc(doc(db, 'sessions', probeId));
      const verified = verifySnap.exists() && verifySnap.data()?.paymentStatus === 'paid';
      await deleteDoc(doc(db, 'sessions', probeId));

      const crudLatency = Math.round(performance.now() - tCrud);
      results.push({
        id: 'firestore-crud-rules',
        title: 'اختبار عمليات الإضافة والتعديل والحذف وقواعد الأمان (CRUD & Rules)',
        status: verified ? 'passed' : 'failed',
        detail: verified
          ? `نجحت دورة الإنشاء والتحديث (مدفوع) والقراءة والحذف الفوري عبر قواعد الأمان في ${crudLatency} مللي ثانية.`
          : 'فشل التحقق من مطابقة البيانات بعد التحديث.',
        latencyMs: crudLatency,
      });
    } catch (err: unknown) {
      try {
        await deleteDoc(doc(db, 'sessions', probeId));
      } catch {
        // ignore
      }
      results.push({
        id: 'firestore-crud-rules',
        title: 'اختبار عمليات الإضافة والتعديل والحذف وقواعد الأمان (CRUD & Rules)',
        status: 'failed',
        detail: `فشل اختبار الكتابة/التحديث في Firestore: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // 3. Check for duplicate sessions in current database
    const seenKeys = new Set<string>();
    const duplicates: string[] = [];
    for (const s of this.sessions) {
      const key = `${normalizeArabic(s.clientName)}|${s.attendanceDate}|${s.attendanceTime}`;
      if (seenKeys.has(key)) {
        duplicates.push(`${s.clientName} (${s.attendanceDate} ${s.attendanceTime})`);
      } else {
        seenKeys.add(key);
      }
    }

    results.push({
      id: 'duplicate-check',
      title: 'فحص منع تكرار الجلسات وسلامة السجلات',
      status: duplicates.length === 0 ? 'passed' : 'warning',
      detail:
        duplicates.length === 0
          ? `لا توجد أي جلسات مكررة بين إجمالي ${this.sessions.length} جلسة مسجلة.`
          : `تم رصد ${duplicates.length} جلسة مكررة: ${duplicates.join('، ')}`,
    });

    // 4. Check Client-Session relational sync
    const clientNamesSet = new Set(this.clients.map((c) => normalizeArabic(c.name)));
    const unlinkedSessions = this.sessions.filter(
      (s) => !clientNamesSet.has(normalizeArabic(s.clientName))
    );

    results.push({
      id: 'relational-integrity',
      title: 'ترابط ملفات المرضى مع سجل الجلسات',
      status: unlinkedSessions.length === 0 ? 'passed' : 'warning',
      detail:
        unlinkedSessions.length === 0
          ? `جميع الجلسات (${this.sessions.length}) مرتبطة بملفات مرضى معتمدة (${this.clients.length} مريض).`
          : `يوجد ${unlinkedSessions.length} جلسة لمرضى غير مضافين في دليل المرضى.`,
    });

    // 5. Check LocalStorage elimination & silent real-time sync
    const hasLegacyLocal =
      typeof window !== 'undefined' &&
      window.localStorage &&
      (localStorage.getItem('physio_sessions_db_v2') !== null ||
        localStorage.getItem('physio_sessions_db') !== null);

    results.push({
      id: 'cloud-only-storage',
      title: 'إلغاء الحفظ المحلي والاعتماد الكامل على السحابة',
      status: !hasLegacyLocal ? 'passed' : 'failed',
      detail: !hasLegacyLocal
        ? 'تم التحقق من إلغاء التخزين المحلي القديم والاعتماد بنسبة 100% على مزامنة Firestore اللحظية الصامتة.'
        : 'لا تزال هناك مفاتيح تخزين محلي قديمة في المتصفح.',
    });

    return results;
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
