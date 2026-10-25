import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Edit3,
  UserPlus,
  Info,
  Check,
  Phone,
  PhoneOff,
  ArrowUpDown,
  MessageCircle,
} from 'lucide-react';
import { SessionRecord } from '../types';

interface SessionsTableProps {
  sessions: SessionRecord[];
  allSessionsCount: number;
  onEditSession: (session: SessionRecord) => void;
  onDeleteSession: (session: SessionRecord) => void;
  onAddSessionForClient: (clientName: string, clientPhone: string, condition: string) => void;
  onToggleStatus: (id: string) => void;
}

type SortField = 'default' | 'date_desc' | 'date_asc' | 'name_asc' | 'price_desc';

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  allSessionsCount,
  onEditSession,
  onDeleteSession,
  onAddSessionForClient,
  onToggleStatus,
}) => {
  const [sortBy, setSortBy] = useState<SortField>('default');

  const sortedSessions = useMemo(() => {
    if (sortBy === 'default') return sessions;
    return [...sessions].sort((a, b) => {
      if (sortBy === 'date_desc') {
        const cmp = (b.attendanceDate || '').localeCompare(a.attendanceDate || '');
        return cmp !== 0 ? cmp : (b.attendanceTime || '').localeCompare(a.attendanceTime || '');
      }
      if (sortBy === 'date_asc') {
        const cmp = (a.attendanceDate || '').localeCompare(b.attendanceDate || '');
        return cmp !== 0 ? cmp : (a.attendanceTime || '').localeCompare(b.attendanceTime || '');
      }
      if (sortBy === 'name_asc') {
        return (a.clientName || '').localeCompare(b.clientName || '', 'ar');
      }
      if (sortBy === 'price_desc') {
        return (Number(b.totalPrice) || 0) - (Number(a.totalPrice) || 0);
      }
      return 0;
    });
  }, [sessions, sortBy]);

  const displayedTotalAmount = sortedSessions.reduce(
    (sum, s) => sum + (Number(s.totalPrice) || 0),
    0
  );

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'credit_card':
        return 'بطاقة ائتمان';
      case 'cash':
      default:
        return 'نقدي';
    }
  };

  const formatWhatsAppUrl = (phone: string, clientName: string) => {
    const digits = phone.replace(/\D/g, '');
    const intlPhone = digits.startsWith('0') ? `20${digits.slice(1)}` : digits;
    const msg = encodeURIComponent(
      `مرحباً ${clientName}، نتواصل معكم من مركز التأهيل والعلاج الطبيعي بخصوص متابعة الجلسات.`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Sort & Summary Bar */}
      <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <span>سجل الجلسات:</span>
          <strong className="text-slate-900 font-mono tabular-nums">{sortedSessions.length}</strong>
          <span>من</span>
          <strong className="text-slate-900 font-mono tabular-nums">{allSessionsCount}</strong>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 hidden sm:inline">ترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="default">الترتيب الافتراضي للسجلات</option>
            <option value="date_desc">التاريخ (الأحدث أولاً)</option>
            <option value="date_asc">التاريخ (الأقدم أولاً)</option>
            <option value="name_asc">اسم المريض (أبجدياً)</option>
            <option value="price_desc">القيمة (الأعلى أولاً)</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 text-xs font-semibold bg-slate-50/75 select-none">
              <th className="py-3.5 px-4 font-bold text-slate-700">اسم العميل / الهاتف</th>
              <th className="py-3.5 px-4 font-bold text-slate-700">نوع الحالة / الإصابة</th>
              <th className="py-3.5 px-4 font-bold text-slate-700 text-center">تاريخ الحضور</th>
              <th className="py-3.5 px-4 font-bold text-slate-700 text-center">تفاصيل السعر والبنود</th>
              <th className="py-3.5 px-4 font-bold text-slate-700 text-center">الإجمالي</th>
              <th className="py-3.5 px-4 font-bold text-slate-700 text-center">حالة الدفع</th>
              <th className="py-3.5 px-4 font-bold text-slate-700 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {sortedSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <p className="font-semibold text-slate-600 mb-1">لا توجد جلسات تطابق البحث المحدد</p>
                    <p className="text-xs text-slate-400">يرجى تعديل الفلاتر أو إضافة جلسة جديدة</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedSessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Client Name & Phone */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-bold text-slate-900 group-hover:text-teal-900">
                      {session.clientName}
                    </div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 flex items-center gap-2">
                      {session.clientPhone && session.clientPhone !== 'بدون هاتف' ? (
                        <>
                          <a
                            href={`tel:${session.clientPhone}`}
                            className="hover:text-teal-700 transition-colors inline-flex items-center gap-1 underline decoration-dotted decoration-slate-400 hover:decoration-teal-600"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{session.clientPhone}</span>
                          </a>
                          <a
                            href={formatWhatsAppUrl(session.clientPhone, session.clientName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        </>
                      ) : (
                        <span className="text-slate-400 italic flex items-center gap-1 font-sans">
                          <PhoneOff className="w-2.5 h-2.5" />
                          <span>بدون هاتف</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Condition & Notes */}
                  <td className="py-3.5 px-4 align-top max-w-xs">
                    <div className="text-slate-800 font-medium">
                      {session.condition}
                    </div>
                    {session.notes && (
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {session.notes}
                      </div>
                    )}
                  </td>

                  {/* Attendance Date & Time */}
                  <td className="py-3.5 px-4 align-top text-center font-mono tabular-nums">
                    <div className="text-xs font-semibold text-slate-800">
                      {session.attendanceDate}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {session.attendanceTime}
                    </div>
                  </td>

                  {/* Price Details */}
                  <td className="py-3.5 px-4 align-top text-center">
                    <div className="text-xs text-slate-700 font-medium whitespace-nowrap">
                      {session.priceDetails || `أساسي: ${session.basePrice} جنيه`}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-4 align-top text-center font-mono tabular-nums">
                    <div className="font-bold text-slate-900 whitespace-nowrap">
                      {session.totalPrice} جنيه
                    </div>
                  </td>

                  {/* Payment Status & Method */}
                  <td className="py-3.5 px-4 align-top text-center">
                    <button
                      onClick={() => onToggleStatus(session.id)}
                      title="انقر لتغيير حالة السداد"
                      className="cursor-pointer group/btn"
                    >
                      {session.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>مدفوع بالكامل</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 transition-colors whitespace-nowrap">
                          <Info className="w-3 h-3 text-amber-600" />
                          <span>معلق / غير مدفوع</span>
                        </span>
                      )}
                    </button>
                    <div className="text-xs text-slate-500 mt-1">
                      {getPaymentMethodLabel(session.paymentMethod)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 align-top text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onDeleteSession(session)}
                        title="حذف الجلسة"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onEditSession(session)}
                        title="تعديل بيانات الجلسة"
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          onAddSessionForClient(
                            session.clientName,
                            session.clientPhone,
                            session.condition
                          )
                        }
                        title="إضافة جلسة جديدة لهذا العميل"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer matching exact screenshot totals */}
      <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 text-xs font-semibold text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>عرض</span>
          <strong className="text-slate-900 font-bold font-mono tabular-nums">{sortedSessions.length}</strong>
          <span>من أصل</span>
          <strong className="text-slate-900 font-bold font-mono tabular-nums">{allSessionsCount}</strong>
          <span>جلسة مسجلة</span>
        </div>

        <div className="flex items-center gap-2 text-slate-800">
          <span>إجمالي قيمة المعروض:</span>
          <span className="font-bold text-base text-teal-800 font-mono tabular-nums">
            {displayedTotalAmount.toLocaleString('en-US')} جنيه
          </span>
        </div>
      </div>
    </div>
  );
};
