import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  X,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { SessionRecord } from '../types';

interface CloseMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  openSessions: SessionRecord[];
  onConfirmCloseMonth: (
    title: string,
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;
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

export const CloseMonthModal: React.FC<CloseMonthModalProps> = ({
  isOpen,
  onClose,
  openSessions,
  onConfirmCloseMonth,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const summary = useMemo(() => {
    const totalSessions = openSessions.length;
    const totalRevenue = openSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const paidSessions = openSessions.filter((s) => s.paymentStatus === 'paid');
    const pendingSessions = openSessions.filter((s) => s.paymentStatus === 'pending');
    const paidRevenue = paidSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const pendingRevenue = pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

    const dates = openSessions
      .map((s) => s.attendanceDate)
      .filter(Boolean)
      .sort();
    const startDate = dates[0] || new Date().toISOString().slice(0, 10);
    const endDate = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);

    const [year, month] = endDate.split('-');
    const monthName = ARABIC_MONTHS[month] || month;
    const suggestedTitle =
      startDate.slice(0, 7) !== endDate.slice(0, 7)
        ? `أرشيف حساب الفترة (${startDate} إلى ${endDate})`
        : `تقفيل حساب شهر ${monthName} ${year}`;

    return {
      totalSessions,
      totalRevenue,
      paidCount: paidSessions.length,
      pendingCount: pendingSessions.length,
      paidRevenue,
      pendingRevenue,
      startDate,
      endDate,
      suggestedTitle,
    };
  }, [openSessions]);

  useEffect(() => {
    if (isOpen) {
      setTitle(summary.suggestedTitle);
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, summary.suggestedTitle]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openSessions.length === 0) {
      setErrorMsg('لا توجد جلسات مفتوحة حالياً لتقفيلها.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onConfirmCloseMonth(title.trim() || summary.suggestedTitle, notes.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || 'تعذر تقفيل الشهر.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">
                تقفيل حساب الشهر وبداية شهر جديد
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with scrollable body and pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Compact Current Period Summary Box */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5 sm:p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-800">ملخص الحساب المراد تقفيله:</span>
                <span className="font-mono tabular-nums text-slate-500" dir="ltr">
                  {summary.startDate} &rarr; {summary.endDate}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">الجلسات المفتوحة</span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tabular-nums">
                    {summary.totalSessions} <span className="text-[11px] font-normal">جلسة</span>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">إجمالي حساب الفترة</span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tabular-nums">
                    {summary.totalRevenue.toLocaleString('en-US')}{' '}
                    <span className="text-[11px] font-normal">ج.م</span>
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-800 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">المحصل ({summary.paidCount})</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-700 font-mono tabular-nums">
                    {summary.paidRevenue.toLocaleString('en-US')} ج.م
                  </div>
                </div>

                <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-amber-800 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">المعلق ({summary.pendingCount})</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-amber-700 font-mono tabular-nums">
                    {summary.pendingRevenue.toLocaleString('en-US')} ج.م
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم أرشيف الشهر:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تقفيل حساب شهر أكتوبر 2026"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات التقفيل (اختياري):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات حول تسوية الحسابات عند التقفيل..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
              />
            </div>
          </div>

          {/* Pinned Footer Actions - Always visible on mobile */}
          <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || openSessions.length === 0}
              className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>
                {isSubmitting ? 'جارٍ الحفظ والتقفيل...' : 'حفظ وتقفيل الشهر'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
