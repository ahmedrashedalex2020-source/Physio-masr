import React from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Users,
  CalendarCheck,
  Smartphone,
  LogOut,
  Gamepad2,
  BarChart3,
} from 'lucide-react';
import { User } from '../services/auth';

interface HeaderProps {
  activeTab: 'sessions' | 'clients' | 'financials' | 'game';
  setActiveTab: (tab: 'sessions' | 'clients' | 'financials' | 'game') => void;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onResetDatabase: () => void;
  onOpenInstallModal: () => void;
  currentUser: User | null;
  onLogout: () => void;
  totalSessions: number;
  totalClients: number;
  syncStatus?: 'synced' | 'syncing' | 'offline';
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenExportModal,
  onResetDatabase,
  onOpenInstallModal,
  currentUser,
  onLogout,
  totalSessions,
  totalClients,
  syncStatus = 'synced',
  onManualSync,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                مركز التأهيل والعلاج الطبيعي
              </h1>
              <p className="text-xs text-slate-500">
                قاعدة البيانات السحابية الموحدة (Firestore)
              </p>
            </div>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs sm:text-sm flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'sessions'
                  ? 'bg-white text-teal-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>سجل الجلسات ({totalSessions})</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'clients'
                  ? 'bg-white text-teal-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>المرضى ({totalClients})</span>
            </button>

            <button
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'financials'
                  ? 'bg-white text-teal-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>التقارير وفحص القاعدة</span>
            </button>

            <button
              onClick={() => setActiveTab('game')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'game'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>محاكاة العيادة</span>
            </button>
          </div>

          {/* Zone 3: Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Real-time Central Database Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncStatus === 'syncing'}
              title="تحديث البيانات مباشرة من قاعدة البيانات المركزية"
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : syncStatus === 'offline'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200/80'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncStatus === 'syncing'
                    ? 'animate-spin text-amber-600'
                    : syncStatus === 'offline'
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              />
              <span className="hidden xl:inline">
                {syncStatus === 'syncing'
                  ? 'جارٍ المزامنة...'
                  : syncStatus === 'offline'
                  ? 'إعادة الاتصال'
                  : 'متصل سحابياً'}
              </span>
            </button>

            <button
              onClick={onOpenInstallModal}
              title="تثبيت التطبيق على هاتفك"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden lg:inline">تثبيت للهاتف</span>
            </button>

            <button
              onClick={onResetDatabase}
              title="إعادة ضبط واستعادة السجلات الأصلية (68 جلسة)"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">استعادة الـ 68 جلسة</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">تصدير</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة جلسة</span>
            </button>

            {/* Logged in User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
                <button
                  onClick={onLogout}
                  title={`تسجيل الخروج (${currentUser.name})`}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
