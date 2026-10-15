import React from 'react';
import { CalendarCheck, DollarSign, Clock, Users, CheckCircle2 } from 'lucide-react';
import { SessionRecord } from '../types';

interface StatsCardsProps {
  sessions: SessionRecord[];
  clientsCount: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ sessions, clientsCount }) => {
  const totalSessions = sessions.length;
  const totalValue = sessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

  const pendingSessions = sessions.filter((s) => s.paymentStatus === 'pending');
  const pendingValue = pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

  const paidSessions = sessions.filter((s) => s.paymentStatus === 'paid');
  const paidValue = paidSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {/* Total Sessions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold">إجمالي الجلسات المسجلة</span>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{totalSessions}</span>
          <span className="text-xs text-slate-500 font-medium">جلسة علاجية</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">مطابقة لقاعدة البيانات المحدثة</div>
      </div>

      {/* Total Value */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold">إجمالي القيمة المسجلة</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{totalValue.toLocaleString()}</span>
          <span className="text-xs font-semibold text-slate-600">جنيه</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          بواقع {totalSessions > 0 ? Math.round(totalValue / totalSessions) : 0} ج.م / جلسة
        </div>
      </div>

      {/* Pending Payments */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold">المدفوعات المعلقة</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-600">{pendingSessions.length}</span>
          <span className="text-xs text-slate-500">
            ({pendingValue.toLocaleString()} ج.م معلق)
          </span>
        </div>
        <div className="text-[11px] text-amber-600/80 font-medium mt-1 flex items-center gap-1">
          <span>حالة السجلات: معلق / غير مدفوع</span>
        </div>
      </div>

      {/* Clients & Paid status */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold">عدد المرضى والعملاء</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{clientsCount}</span>
          <span className="text-xs text-slate-500">مريض مسجل</span>
        </div>
        <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>تم تحصيل {paidSessions.length} جلسة ({paidValue.toLocaleString()} ج.م)</span>
        </div>
      </div>
    </div>
  );
};
