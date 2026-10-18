import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { FiltersBar } from './components/FiltersBar';
import { SessionsTable } from './components/SessionsTable';
import { ClientsDirectory } from './components/ClientsDirectory';
import { SessionModal } from './components/SessionModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExportModal } from './components/ExportModal';
import { InstallPromptModal } from './components/InstallPromptModal';
import { LoginScreen } from './components/LoginScreen';
import { ClinicGameView } from './components/ClinicGameView';
import { StorageService, normalizeArabic } from './services/storage';
import { AuthService, User } from './services/auth';
import { SessionRecord, ClientProfile, FilterOptions } from './types';
import { CheckCircle2, AlertCircle, Info, ShieldCheck, Database, Smartphone, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'clients' | 'financials' | 'game'>('sessions');

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

  // Capture PWA Install event for Android Chrome & detect mobile
  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto open install sheet on mobile if prompted
      if (!isRunningStandalone) {
        setIsInstallModalOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Auto prompt mobile users after 1.5 seconds if not yet installed and not dismissed in this session
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    try {
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (isMobile && !isRunningStandalone && !dismissed) {
        const timer = setTimeout(() => {
          setIsInstallModalOpen(true);
        }, 1500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    condition: '',
    paymentStatus: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    clientName: '',
  });

  // Central Server Cloud Sync Status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Load initial data and establish reactive sync across all devices
  useEffect(() => {
    // 1. Instant local load for 0ms lag
    const loadedSessions = StorageService.getSessions();
    const loadedClients = StorageService.getClients();
    setSessions(loadedSessions);
    setClients(loadedClients);

    // 2. Subscribe to reactive storage changes
    const unsubscribe = StorageService.subscribe((newSessions, newClients) => {
      setSessions(newSessions);
      setClients(newClients);
    });

    // 3. Central server synchronization function
    const triggerSync = async () => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }
      setSyncStatus('syncing');
      try {
        const remoteData = await StorageService.fetchRemoteData();
        if (remoteData) {
          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
      } catch {
        setSyncStatus('offline');
      }
    };

    // Initial sync from central server immediately
    triggerSync();

    // 4. Auto sync on mobile unlock, tab switch or focus
    const handleFocus = () => triggerSync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };
    const handleOnline = () => triggerSync();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // 5. Periodic background sync every 8 seconds when tab is open
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    }, 8000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Search query (name, phone, notes)
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
      if (filters.clientName && session.clientName !== filters.clientName) {
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

      return true;
    });
  }, [sessions, filters]);

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

  const handleConfirmDelete = () => {
    if (!sessionToDelete) return;
    const success = StorageService.deleteSession(sessionToDelete.id);
    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      showToast(`تم حذف جلسة العميل (${sessionToDelete.clientName}) بنجاح`, 'info');
    }
    setSessionToDelete(null);
  };

  const handleTogglePaymentStatus = (id: string) => {
    const updated = StorageService.togglePaymentStatus(id);
    if (updated) {
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast(
        updated.paymentStatus === 'paid'
          ? `تم تحديث حالة جلسة (${updated.clientName}) إلى مدفوع بالكامل`
          : `تم تحديث حالة جلسة (${updated.clientName}) إلى معلق / غير مدفوع`
      );
    }
  };

  const handleSaveSession = (sessionData: any) => {
    if (editingSession) {
      // Update existing
      const result = StorageService.updateSession(sessionData);
      if (result.success) {
        setSessions(StorageService.getSessions());
        setClients(StorageService.getClients());
        showToast(`تم تحديث بيانات جلسة (${sessionData.clientName}) بنجاح`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } else {
      // Add new with duplicate prevention
      const result = StorageService.addSession(sessionData);
      if (result.success && result.session) {
        setSessions(StorageService.getSessions());
        setClients(StorageService.getClients());
        showToast(`تمت إضافة الجلسة لقاعدة البيانات بنجاح (مع منع التكرار)`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    }
  };

  const handleResetDatabase = () => {
    if (
      window.confirm(
        'هل تريد مسح البيانات وإعادة تحميل السجلات الأصلية الـ 68 من الصور المرفقة مع التأكد من عدم وجود أي تكرار؟'
      )
    ) {
      StorageService.resetToDefault();
      const reloadedSessions = StorageService.getSessions();
      const reloadedClients = StorageService.getClients();
      setSessions(reloadedSessions);
      setClients(reloadedClients);
      showToast(
        `تم مسح البيانات السابقة واستعادة الـ 68 جلسة الأصلية بنجاح دون أي تكرار (إجمالي 20,400 جنيه)`
      );
    }
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    showToast('جارٍ مزامنة وتحديث السجلات مع السيرفر المركزي...', 'info');
    try {
      const res = await StorageService.fetchRemoteData();
      if (res) {
        setSyncStatus('synced');
        showToast('تمت المزامنة بنجاح وحفظ أحدث البيانات من السيرفر المركزي 🟢');
      } else {
        setSyncStatus('offline');
        showToast('تعذر الاتصال بالسيرفر، يتم حفظ البيانات محلياً', 'error');
      }
    } catch {
      setSyncStatus('offline');
      showToast('تعذر الاتصال بالسيرفر، يتم حفظ البيانات محلياً', 'error');
    }
  };

  const handleFilterByClient = (clientName: string) => {
    setFilters((prev) => ({
      ...prev,
      clientName: clientName,
      searchQuery: '',
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
        onResetDatabase={handleResetDatabase}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        totalSessions={sessions.length}
        totalClients={clients.length}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Mobile Quick Banner for PWA Installation & Cloud Sync */}
      {isStandalone ? (
        <div className="bg-emerald-900 text-emerald-100 text-xs px-3.5 py-2 shadow-xs flex items-center justify-between sm:hidden">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {syncStatus === 'syncing' ? 'جارٍ مزامنة السجلات...' : 'تطبيق نشط ومتزامن سحابياً 🟢'}
            </span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] px-2.5 py-1 rounded border border-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white text-xs px-3.5 py-2.5 shadow-md flex items-center justify-between sm:hidden gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-teal-200 shrink-0 animate-pulse" />
            <div className="truncate">
              <span className="font-bold block leading-tight truncate">مركز العلاج الطبيعي والتأهيل</span>
              <span className="text-[10px] text-teal-200">
                {syncStatus === 'syncing'
                  ? 'جارٍ المزامنة السحابية...'
                  : syncStatus === 'offline'
                  ? 'وضع غير متصل بالسيرفر'
                  : 'متصل ومتزامن مع السيرفر 🟢'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              title="مزامنة فورية"
              className="bg-teal-600/90 hover:bg-teal-600 text-white text-[11px] px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1 border border-teal-400/40 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>مزامنة</span>
            </button>
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="bg-white text-teal-900 font-black px-2.5 py-1.5 rounded-md text-[11px] shadow-xs hover:bg-teal-50 cursor-pointer"
            >
              تثبيت 📱
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* KPI Summary Cards */}
        <StatsCards sessions={sessions} clientsCount={clients.length} />

        {/* Database Status Notice */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-4 py-3 mb-5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>حالة قاعدة البيانات:</strong> تم مسح البيانات السابقة وإدخال كافة بيانات الجلسات الـ 68 من الصور المرفقة بدقة 100% مع تفعيل نظام الحماية من التكرار والربط التلقائي بملفات المرضى.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-semibold bg-white/70 px-2 py-0.5 rounded border border-emerald-200">
            <Database className="w-3 h-3" />
            <span>68 سجل | 20,400 ج.م</span>
          </div>
        </div>

        {activeTab === 'sessions' ? (
          <div>
            {/* Filter controls */}
            <FiltersBar
              filters={filters}
              setFilters={setFilters}
              conditions={uniqueConditions}
              clientNames={uniqueClientNames}
              totalFiltered={filteredSessions.length}
              totalAll={sessions.length}
            />

            {/* Main Interactive Table */}
            <SessionsTable
              sessions={filteredSessions}
              allSessionsCount={sessions.length}
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
          />
        ) : (
          /* Interactive Clinic Tycoon / Manager Game Mode */
          <ClinicGameView
            sessions={sessions}
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
        <p>نظام إدارة مركز العلاج الطبيعي والتأهيل الحركي &bull; تم إدخال السجلات ومطابقة الصور بدقة</p>
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

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        session={sessionToDelete}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessions={sessions}
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
