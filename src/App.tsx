import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FiltersBar } from './components/FiltersBar';
import { SessionsTable } from './components/SessionsTable';
import { ClientsDirectory } from './components/ClientsDirectory';
import { FinancialsAndDiagnosticsView } from './components/FinancialsAndDiagnosticsView';
import { SessionModal } from './components/SessionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { CloseMonthModal } from './components/CloseMonthModal';
import { ExportModal } from './components/ExportModal';
import { InstallPromptModal } from './components/InstallPromptModal';
import { LoginScreen } from './components/LoginScreen';
import { ClinicGameView } from './components/ClinicGameView';
import { StorageService, normalizeArabic } from './services/storage';
import { AuthService, User } from './services/auth';
import { SessionRecord, ClientProfile, MonthlyArchive, FilterOptions } from './types';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck,
  Database,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [archives, setArchives] = useState<MonthlyArchive[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'clients' | 'financials' | 'game'>(
    'sessions'
  );

  // Modals state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRecord | null>(null);
  const [clientForNewSession, setClientForNewSession] = useState<{
    name: string;
    phone: string;
    condition: string;
  } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionRecord | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Capture PWA Install event for Android Chrome
  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Filters State (periodFilter defaults to 'current' so the dashboard tracks the active open month)
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    condition: '',
    paymentStatus: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    clientName: '',
    periodFilter: 'current',
  });

  // Central Server Cloud Sync Status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Load initial data and establish silent real-time Firestore sync across all devices
  useEffect(() => {
    setSessions(StorageService.getSessions());
    setClients(StorageService.getClients());
    setArchives(StorageService.getArchives());

    const unsubscribeData = StorageService.subscribe((newSessions, newClients, newArchives) => {
      setSessions(newSessions);
      setClients(newClients);
      setArchives(newArchives);
    });

    const unsubscribeStatus = StorageService.subscribeStatus((status) => {
      setSyncStatus(status);
    });

    const handleOnline = () => {
      setSyncStatus('synced');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeData();
      unsubscribeStatus();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Currently open (unarchived) sessions belonging to the active month
  const openSessions = useMemo(() => {
    return sessions.filter((s) => !s.archiveId);
  }, [sessions]);

  // Distinct calendar months (YYYY-MM) across all sessions for quick historical month lookup
  const availableCalendarMonths = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.attendanceDate && s.attendanceDate.length >= 7) {
        set.add(s.attendanceDate.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  // Sessions scoped to the selected Monthly Period / Archive (drives StatsCards and base table period)
  const periodScopedSessions = useMemo(() => {
    const pf = filters.periodFilter || 'current';
    if (pf === 'current') {
      return sessions.filter((s) => !s.archiveId);
    }
    if (pf === 'all') {
      return sessions;
    }
    if (pf.startsWith('archive:')) {
      const archId = pf.replace('archive:', '');
      return sessions.filter((s) => s.archiveId === archId);
    }
    if (pf.startsWith('month:')) {
      const ym = pf.replace('month:', '');
      return sessions.filter((s) => (s.attendanceDate || '').startsWith(ym));
    }
    return sessions;
  }, [sessions, filters.periodFilter]);

  // Filtered Sessions (applies search, condition, client, status, method, and startDate/endDate on top of periodScopedSessions)
  const filteredSessions = useMemo(() => {
    return periodScopedSessions.filter((session) => {
      // Search query (name, phone, notes, condition)
      if (filters.searchQuery) {
        const queryNorm = normalizeArabic(filters.searchQuery);
        const nameNorm = normalizeArabic(session.clientName);
        const phone = session.clientPhone || '';
        const notesNorm = session.notes ? normalizeArabic(session.notes) : '';
        const condNorm = normalizeArabic(session.condition);

        const matches =
          nameNorm.includes(queryNorm) ||
          phone.includes(filters.searchQuery.trim()) ||
          notesNorm.includes(queryNorm) ||
          condNorm.includes(queryNorm);

        if (!matches) return false;
      }

      // Condition filter
      if (filters.condition && session.condition !== filters.condition) {
        return false;
      }

      // Client name filter
      if (
        filters.clientName &&
        normalizeArabic(session.clientName) !== normalizeArabic(filters.clientName)
      ) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus && session.paymentStatus !== filters.paymentStatus) {
        return false;
      }

      // Payment method filter
      if (filters.paymentMethod && session.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      // Start date filter
      if (filters.startDate && session.attendanceDate < filters.startDate) {
        return false;
      }

      // End date filter
      if (filters.endDate && session.attendanceDate > filters.endDate) {
        return false;
      }

      return true;
    });
  }, [periodScopedSessions, filters]);

  // Extract distinct conditions and client names for filter dropdowns
  const uniqueConditions = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.condition))).filter(Boolean);
  }, [sessions]);

  const uniqueClientNames = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.clientName))).filter(Boolean);
  }, [sessions]);

  // Handlers
  const handleOpenAddSession = () => {
    setEditingSession(null);
    setClientForNewSession(null);
    setIsSessionModalOpen(true);
  };

  const handleAddSessionForClient = (
    clientName: string,
    clientPhone: string,
    condition: string
  ) => {
    setEditingSession(null);
    setClientForNewSession({ name: clientName, phone: clientPhone, condition });
    setIsSessionModalOpen(true);
  };

  const handleEditSession = (session: SessionRecord) => {
    setEditingSession(session);
    setClientForNewSession(null);
    setIsSessionModalOpen(true);
  };

  const handleDeleteClick = (session: SessionRecord) => {
    setSessionToDelete(session);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    const target = sessionToDelete;
    const success = await StorageService.deleteSession(target.id);
    if (success) {
      setSessions(StorageService.getSessions());
      setClients(StorageService.getClients());
      showToast(`تم حذف جلسة العميل (${target.clientName}) من قاعدة البيانات بنجاح`, 'info');
    } else {
      showToast('تعذر حذف الجلسة من قاعدة البيانات. يرجى المحاولة مرة أخرى.', 'error');
    }
    setSessionToDelete(null);
  };

  const handleTogglePaymentStatus = async (id: string) => {
    const updated = await StorageService.togglePaymentStatus(id);
    if (updated) {
      setSessions(StorageService.getSessions());
      setClients(StorageService.getClients());
      showToast(
        updated.paymentStatus === 'paid'
          ? `تم تحديث حالة جلسة (${updated.clientName}) في قاعدة البيانات إلى مدفوع بالكامل`
          : `تم تحديث حالة جلسة (${updated.clientName}) في قاعدة البيانات إلى معلق / غير مدفوع`
      );
    } else {
      showToast('تعذر تحديث حالة الدفع في قاعدة البيانات.', 'error');
    }
  };

  const handleSaveSession = async (
    sessionData: any
  ): Promise<{ success: boolean; error?: string }> => {
    if (editingSession) {
      const result = await StorageService.updateSession(sessionData);
      if (result.success) {
        setSessions(StorageService.getSessions());
        setClients(StorageService.getClients());
        showToast(`تم تحديث بيانات جلسة (${sessionData.clientName}) في قاعدة البيانات بنجاح`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } else {
      const result = await StorageService.addSession(sessionData);
      if (result.success && result.session) {
        setSessions(StorageService.getSessions());
        setClients(StorageService.getClients());
        // Ensure user is viewing the current open month when adding a new session
        setFilters((prev) => ({ ...prev, periodFilter: 'current' }));
        showToast(`تمت إضافة الجلسة إلى حساب الشهر الجاري بنجاح`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  };

  const handleConfirmCloseMonth = async (
    title: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setSyncStatus('syncing');
    const res = await StorageService.closeCurrentMonth(title, notes);
    if (res.success && res.archive) {
      setSessions(StorageService.getSessions());
      setArchives(StorageService.getArchives());
      setFilters((prev) => ({
        ...prev,
        periodFilter: 'current',
        startDate: '',
        endDate: '',
      }));
      setSyncStatus('synced');
      showToast(
        `تم تقفيل وأرشفة «${res.archive.title}» بنجاح وبدأ الآن حساب شهر جديد من الصفر!`,
        'success'
      );
      return { success: true };
    } else {
      setSyncStatus('offline');
      return { success: false, error: res.error };
    }
  };

  const handleReopenArchive = async (archiveId: string) => {
    setSyncStatus('syncing');
    const res = await StorageService.reopenArchive(archiveId);
    if (res.success) {
      setSessions(StorageService.getSessions());
      setArchives(StorageService.getArchives());
      setFilters((prev) => ({ ...prev, periodFilter: 'current' }));
      setSyncStatus('synced');
      showToast('تم إعادة فتح الشهر المؤرشف وإعادة جلساته إلى الحساب الجاري بنجاح', 'info');
    } else {
      setSyncStatus('offline');
      showToast(res.error || 'تعذر إعادة فتح الأرشيف', 'error');
    }
  };

  const handleSaveClient = async (
    clientData: Partial<ClientProfile> & { name: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await StorageService.saveClient(clientData);
    if (result.success) {
      setClients(StorageService.getClients());
      showToast(`تم حفظ ملف المريض (${clientData.name}) في قاعدة البيانات بنجاح`);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleDeleteClient = async (client: ClientProfile) => {
    const ok = await StorageService.deleteClient(client.id);
    if (ok) {
      setClients(StorageService.getClients());
      showToast(`تم حذف ملف المريض (${client.name}) من قاعدة البيانات`, 'info');
    } else {
      showToast('تعذر حذف ملف المريض.', 'error');
    }
  };

  const handleConfirmResetDatabase = async () => {
    setSyncStatus('syncing');
    showToast('جارٍ استعادة السجلات الأصلية الـ 68 في قاعدة البيانات السحابية...', 'info');
    const ok = await StorageService.resetToDefault();
    if (ok) {
      setSessions(StorageService.getSessions());
      setClients(StorageService.getClients());
      setArchives(StorageService.getArchives());
      setFilters((prev) => ({ ...prev, periodFilter: 'current' }));
      setSyncStatus('synced');
      showToast(
        'تمت استعادة الـ 68 جلسة الأصلية و17 ملف مريض في قاعدة البيانات السحابية بنجاح (20,400 جنيه)'
      );
    } else {
      setSyncStatus('offline');
      showToast('تعذر إعادة ضبط قاعدة البيانات السحابية.', 'error');
    }
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    showToast('جارٍ التحقق من مزامنة قاعدة البيانات السحابية (Firestore)...', 'info');
    try {
      const res = await StorageService.fetchRemoteData();
      if (res) {
        setSyncStatus('synced');
        showToast('قاعدة البيانات متزامنة ومحدثة بالكامل بين جميع الأجهزة', 'success');
      } else {
        setSyncStatus('offline');
        showToast('تعذر الوصول إلى قاعدة البيانات السحابية. تحقق من الإنترنت.', 'error');
      }
    } catch {
      setSyncStatus('offline');
      showToast('خطأ في الاتصال بقاعدة البيانات السحابية.', 'error');
    }
  };

  const handleFilterByClient = (clientName: string) => {
    setFilters((prev) => ({
      ...prev,
      clientName: clientName,
      searchQuery: '',
      periodFilter: 'all',
    }));
    setActiveTab('sessions');
  };

  const handleFilterByArchive = (archiveId: string) => {
    setFilters((prev) => ({
      ...prev,
      periodFilter: `archive:${archiveId}`,
      searchQuery: '',
      clientName: '',
    }));
    setActiveTab('sessions');
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    showToast('تم تسجيل الخروج من النظام بنجاح', 'info');
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`مرحباً بك ${user.name}، تم تسجيل الدخول بنجاح`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-900 text-rose-50 border-rose-700'
                : toast.type === 'info'
                ? 'bg-slate-900 text-slate-100 border-slate-700'
                : 'bg-teal-900 text-teal-50 border-teal-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAddSession}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetDatabase={() => setIsResetModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        totalSessions={periodScopedSessions.length}
        totalClients={clients.length}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Mobile Quick Banner for Central Database & PWA Installation */}
      {isStandalone ? (
        <div
          className={`text-xs px-3.5 py-2 shadow-xs flex items-center justify-between sm:hidden transition-colors ${
            syncStatus === 'offline'
              ? 'bg-rose-950 text-rose-100 border-b border-rose-850'
              : 'bg-emerald-900 text-emerald-100 border-b border-emerald-800'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold">
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
            ) : syncStatus === 'offline' ? (
              <Database className="w-4 h-4 text-rose-300" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            )}
            <span>
              {syncStatus === 'syncing'
                ? 'جارٍ الاتصال بقاعدة البيانات...'
                : syncStatus === 'offline'
                ? 'غير متصل بقاعدة البيانات المركزية'
                : 'متصل مباشرة بقاعدة البيانات السحابية'}
            </span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className={`text-[11px] px-2.5 py-1 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors ${
              syncStatus === 'offline'
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-700'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'offline' ? 'إعادة المحاولة' : 'تحديث'}</span>
          </button>
        </div>
      ) : (
        <div
          className={`text-white text-xs px-3.5 py-2.5 shadow-md flex items-center justify-between sm:hidden gap-2 transition-colors ${
            syncStatus === 'offline'
              ? 'bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900'
              : 'bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {syncStatus === 'offline' ? (
              <Database className="w-4 h-4 text-rose-300 shrink-0" />
            ) : (
              <Smartphone className="w-4 h-4 text-teal-200 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-bold block leading-tight truncate">
                مركز العلاج الطبيعي والتأهيل
              </span>
              <span className="text-[10px] text-teal-100">
                {syncStatus === 'syncing'
                  ? 'جارٍ الاتصال وتحديث قاعدة البيانات...'
                  : syncStatus === 'offline'
                  ? 'غير متصل بقاعدة البيانات المركزية'
                  : 'متصل مباشرة بقاعدة البيانات السحابية'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              title="تحديث من قاعدة البيانات"
              className={`text-[11px] px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1 cursor-pointer shadow-xs ${
                syncStatus === 'offline'
                  ? 'bg-rose-500 hover:bg-rose-400 text-white font-black'
                  : 'bg-teal-600/90 hover:bg-teal-600 text-white border border-teal-400/40'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'offline' ? 'إعادة المحاولة' : 'تحديث'}</span>
            </button>
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-white text-teal-900 font-black px-2.5 py-1.5 rounded-md text-[11px] shadow-xs hover:bg-teal-50 cursor-pointer"
            >
              تثبيت
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* KPI Summary Cards & Dedicated Close Month Control */}
        <StatsCards
          sessions={periodScopedSessions}
          openSessionsCount={openSessions.length}
          clientsCount={clients.length}
          periodFilter={filters.periodFilter}
          archives={archives}
          onOpenCloseMonthModal={() => setIsCloseMonthModalOpen(true)}
          onSelectPeriodFilter={(period) =>
            setFilters((prev) => ({ ...prev, periodFilter: period }))
          }
        />

        {/* Database Status Notice */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-4 py-3 mb-5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>حالة قاعدة البيانات السحابية (Firebase Firestore):</strong> مزامنة لحظية صامتة وموحدة بنسبة 100% بين الكمبيوتر والموبايل مع حفظ فوري لكافة الإضافات والأرشيف الشهري.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-mono tabular-nums text-[11px] text-emerald-700 font-semibold">
            <Database className="w-3 h-3" />
            <span>
              إجمالي القاعدة: {sessions.length} سجل · {archives.length} أرشيف شهري
            </span>
          </div>
        </div>

        {activeTab === 'sessions' ? (
          <div>
            {/* Filter controls including Monthly Archive & Calendar Month Switcher */}
            <FiltersBar
              filters={filters}
              setFilters={setFilters}
              conditions={uniqueConditions}
              clientNames={uniqueClientNames}
              archives={archives}
              availableCalendarMonths={availableCalendarMonths}
              openSessionsCount={openSessions.length}
              totalFiltered={filteredSessions.length}
              totalAll={sessions.length}
            />

            {/* Main Interactive Table */}
            <SessionsTable
              sessions={filteredSessions}
              allSessionsCount={periodScopedSessions.length}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteClick}
              onAddSessionForClient={handleAddSessionForClient}
              onToggleStatus={handleTogglePaymentStatus}
            />
          </div>
        ) : activeTab === 'clients' ? (
          /* Clients Directory Tab */
          <ClientsDirectory
            clients={clients}
            sessions={sessions}
            onSelectClientToFilter={handleFilterByClient}
            onAddSessionForClient={handleAddSessionForClient}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
          />
        ) : activeTab === 'financials' ? (
          /* Financial Reports, Monthly Archives & Live Database Diagnostics Tab */
          <FinancialsAndDiagnosticsView
            sessions={periodScopedSessions}
            clients={clients}
            archives={archives}
            onSelectClientToFilter={handleFilterByClient}
            onSelectArchiveToFilter={handleFilterByArchive}
            onReopenArchive={handleReopenArchive}
            onOpenCloseMonthModal={() => setIsCloseMonthModalOpen(true)}
            onToggleStatus={handleTogglePaymentStatus}
          />
        ) : (
          /* Interactive Clinic Tycoon / Manager Game Mode */
          <ClinicGameView
            sessions={periodScopedSessions}
            clients={clients}
            currentUser={currentUser}
            onToggleStatus={handleTogglePaymentStatus}
            onSaveSession={handleSaveSession}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteClick}
            onOpenAddModal={handleOpenAddSession}
            onSwitchToClassic={() => setActiveTab('sessions')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          نظام إدارة مركز العلاج الطبيعي والتأهيل الحركي &bull; متصل بقاعدة بيانات Firebase Firestore الموحدة
        </p>
      </footer>

      {/* Modals */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSave={handleSaveSession}
        initialData={editingSession}
        existingClients={clients}
        defaultClient={clientForNewSession}
      />

      <CloseMonthModal
        isOpen={isCloseMonthModalOpen}
        onClose={() => setIsCloseMonthModalOpen(false)}
        openSessions={openSessions}
        onConfirmCloseMonth={handleConfirmCloseMonth}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        session={sessionToDelete}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmResetDatabase}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessions={periodScopedSessions}
      />

      <InstallPromptModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          showToast('تم تثبيت التطبيق بنجاح على هاتفك!');
          setDeferredPrompt(null);
        }}
      />
    </div>
  );
}
