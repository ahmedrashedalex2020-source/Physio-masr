import { Activity, Plus, RefreshCw, FileSpreadsheet, Users, CalendarCheck, Smartphone, LogOut, Gamepad2, CloudCheck, Cloud } from 'lucide-react';
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  مركز التأهيل والعلاج الطبيعي
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60">
                  قاعدة البيانات المحدثة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                نظام إدارة سجلات الجلسات والمرضى ومتابعة الحالات والمدفوعات
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-sm flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'sessions'
                  ? 'bg-white text-teal-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>سجل الجلسات</span>
              <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.2 rounded-full font-bold">
                {totalSessions}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-white text-teal-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>المرضى والعملاء</span>
              <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.2 rounded-full font-bold">
                {totalClients}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('game')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm font-bold'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-100/70 font-semibold'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>وضع اللعبة (إدارة العيادة)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'game' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-800'
                }`}
              >
                🎮 محاكاة
              </span>
            </button>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Real-time Cloud Sync Button */}
            <button
              onClick={onManualSync}
              disabled={syncStatus === 'syncing'}
              title="مزامنة فورية وتحديث البيانات عبر السيرفر المركزي مع جميع الأجهزة (الهاتف والكمبيوتر)"
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : syncStatus === 'offline'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200/80 shadow-2xs'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncStatus === 'syncing' ? 'animate-spin text-amber-600' : 'text-emerald-600'
                }`}
              />
              <span className="hidden sm:inline">
                {syncStatus === 'syncing'
                  ? 'جارٍ المزامنة...'
                  : syncStatus === 'offline'
                  ? 'وضع غير متصل'
                  : 'متصل ومتزامن'}
              </span>
              <span className="sm:hidden">
                {syncStatus === 'syncing' ? 'مزامنة...' : 'مزامنة'}
              </span>
            </button>

            <button
              onClick={onOpenInstallModal}
              title="تثبيت التطبيق على هاتفك وتشغيله كـ تطبيق مستقل"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-lg transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span>تثبيت التطبيق على الهاتف</span>
            </button>

            <button
              onClick={onResetDatabase}
              title="إعادة ضبط ومطابقة البيانات مع الصور الأصلية (68 جلسة)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>استعادة الملفات المحدثة</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير / طباعة</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm shadow-teal-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إضافة جلسة جديدة</span>
            </button>

            {/* Logged in User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1 border-r border-slate-200 pr-2">
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج من النظام"
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
