import React from 'react';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  Archive,
  RotateCcw,
  FolderArchive,
  Sparkles,
} from 'lucide-react';
import { SessionRecord, MonthlyArchive } from '../types';

interface StatsCardsProps {
  sessions: SessionRecord[];
  openSessionsCount: number;
  clientsCount: number;
  periodFilter: string;
  archives: MonthlyArchive[];
  onOpenCloseMonthModal: () => void;
  onSelectPeriodFilter: (period: string) => void;
}

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

function formatCalendarMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${ARABIC_MONTHS[m] || m} ${y}`;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  sessions,
  openSessionsCount,
  clientsCount,
  periodFilter,
  archives,
  onOpenCloseMonthModal,
  onSelectPeriodFilter,
}) => {
  const totalSessions = sessions.length;

  const totalAmount = sessions.reduce(
    (sum, s) => sum + (Number(s.totalPrice) || 0),
    0
  );

  const pendingSessions = sessions.filter((s) => s.paymentStatus === 'pending');
  const pendingAmount = pendingSessions.reduce(
    (sum, s) => sum + (Number(s.totalPrice) || 0),
    0
  );

  const paidSessions = sessions.filter((s) => s.paymentStatus === 'paid');
  const paidAmount = paidSessions.reduce(
    (sum, s) => sum + (Number(s.totalPrice) || 0),
    0
  );

  // Determine active period label for the Monthly Stats & Tracking Header
  let activePeriodTitle = 'لوحة إحصائيات ومتابعة الشهر الجاري (الحساب المفتوح)';
  let activePeriodSubtitle =
    openSessionsCount > 0
      ? `يعرض جلسات وإيرادات الشهر الحالي المفتوح فقط (${openSessionsCount} جلسة جارية)`
      : 'تم تقفيل الشهر السابق وأرشفته بنجاح — الحساب جاهز لتسجيل ومتابعة جلسات الشهر الجديد';
  let isViewingArchive = false;

  if (periodFilter === 'all') {
    activePeriodTitle = 'إحصائيات جميع الشهور والسجلات (الحالي + الأرشيف العام)';
    activePeriodSubtitle = `يعرض الإجمالي التراكمي لكافة الجلسات المسجلة والأرشيف (${totalSessions} جلسة)`;
    isViewingArchive = true;
  } else if (periodFilter.startsWith('archive:')) {
    const archId = periodFilter.replace('archive:', '');
    const foundArch = archives.find((a) => a.id === archId);
    activePeriodTitle = foundArch
      ? `عرض أرشيف مغلق: ${foundArch.title}`
      : 'عرض شهر مؤرشف سابق';
    activePeriodSubtitle = foundArch
      ? `فترة الأرشيف من ${foundArch.startDate} إلى ${foundArch.endDate} · تم التقفيل في ${new Date(
          foundArch.closedAt
        ).toLocaleDateString('ar-EG')}`
      : 'تصفح بيانات وإحصائيات الشهر المؤرشف';
    isViewingArchive = true;
  } else if (periodFilter.startsWith('month:')) {
    const ym = periodFilter.replace('month:', '');
    activePeriodTitle = `إحصائيات ومتابعة شهر ${formatCalendarMonth(ym)}`;
    activePeriodSubtitle = `عرض جميع الجلسات المسجلة خلال شهر ${formatCalendarMonth(ym)}`;
    isViewingArchive = true;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Monthly Tracking Control Bar */}
      <div
        className={`rounded-xl border px-4 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 transition-colors ${
          isViewingArchive
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isViewingArchive
                ? 'bg-amber-500 text-white'
                : 'bg-teal-600 text-white'
            }`}
          >
            {isViewingArchive ? (
              <FolderArchive className="w-5 h-5" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                {activePeriodTitle}
              </h2>
              {isViewingArchive ? (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-200/80 text-amber-900 border border-amber-300">
                  وضع استعراض الأرشيف / شهر محدد
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  الشهر المفتوح حالياً
                </span>
              )}
            </div>
            <p
              className={`text-xs mt-0.5 ${
                isViewingArchive ? 'text-amber-800' : 'text-slate-500'
              }`}
            >
              {activePeriodSubtitle}
            </p>
          </div>
        </div>

        {/* Dedicated Monthly Closing & Period Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isViewingArchive && (
            <button
              type="button"
              onClick={() => onSelectPeriodFilter('current')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-900 bg-white hover:bg-teal-50 border border-teal-300 rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              <span>العودة لمتابعة الشهر الجديد المفتوح</span>
            </button>
          )}

          {archives.length > 0 && !isViewingArchive && (
            <button
              type="button"
              onClick={() => onSelectPeriodFilter(`archive:${archives[0].id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderArchive className="w-3.5 h-3.5 text-slate-600" />
              <span>أرشيف الشهور السابقة ({archives.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCloseMonthModal}
            disabled={openSessionsCount === 0}
            title={
              openSessionsCount === 0
                ? 'الحساب الجاري مصفر بالفعل وجاهز للشهر الجديد'
                : 'تقفيل حساب الشهر الحالي وأرشفته وبدء حساب شهر جديد من الصفر'
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Archive className="w-4 h-4 text-teal-400" />
            <span>تقفيل حساب الشهر وبداية شهر جديد</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards reflecting the selected period (Current Open Month by default) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sessions in Period */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              {isViewingArchive ? 'جلسات الفترة المعروضة' : 'جلسات الشهر الحالي'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {totalSessions}
              </span>
              <span className="text-xs text-slate-500 font-medium">جلسة</span>
            </div>
            <p className="text-[11px] text-teal-700 font-medium mt-1">
              لإجمالي {clientsCount} عميل مسجل بالعيادة
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Revenue in Period */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              {isViewingArchive ? 'إجمالي إيرادات الفترة' : 'إجمالي حساب الشهر'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {totalAmount.toLocaleString('en-US')}
              </span>
              <span className="text-xs text-slate-500 font-medium">جنيه</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              300 جنيه للجلسة الواحدة
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Pending Amount in Period */}
        <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-800/80 mb-1">
              مبالغ معلقة ({pendingSessions.length} جلسة)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
                {pendingAmount.toLocaleString('en-US')}
              </span>
              <span className="text-xs text-amber-700 font-medium">جنيه</span>
            </div>
            <p className="text-[11px] text-amber-600/90 mt-1">
              في انتظار التحصيل والسداد
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Paid Amount in Period */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-800/80 mb-1">
              مبالغ محصلة ({paidSessions.length} جلسة)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
                {paidAmount.toLocaleString('en-US')}
              </span>
              <span className="text-xs text-emerald-700 font-medium">جنيه</span>
            </div>
            <p className="text-[11px] text-emerald-600/90 mt-1">
              تم السداد بالكامل
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
