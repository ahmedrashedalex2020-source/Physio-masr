import React from 'react';
import { X, Download, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { SessionRecord } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, sessions }) => {
  if (!isOpen) return null;

  const downloadCSV = () => {
    // CSV with UTF-8 BOM so Excel opens Arabic correctly
    const headers = [
      'م',
      'اسم العميل',
      'الهاتف',
      'نوع الحالة / الإصابة',
      'الملاحظات',
      'تاريخ الحضور',
      'وقت الحضور',
      'تفاصيل السعر',
      'الإجمالي (جنيه)',
      'حالة الدفع',
      'طريقة الدفع',
    ];

    const rows = sessions.map((s, idx) => [
      idx + 1,
      `"${s.clientName}"`,
      `"${s.clientPhone || 'بدون هاتف'}"`,
      `"${s.condition}"`,
      `"${s.notes || ''}"`,
      s.attendanceDate,
      s.attendanceTime,
      `"${s.priceDetails}"`,
      s.totalPrice,
      s.paymentStatus === 'paid' ? 'مدفوع' : 'معلق / غير مدفوع',
      s.paymentMethod === 'bank_transfer'
        ? 'تحويل بنكي'
        : s.paymentMethod === 'credit_card'
        ? 'بطاقة ائتمان'
        : 'نقدي',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_جلسات_العلاج_الطبيعي_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `physio_sessions_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">تصدير وطباعة البيانات</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            يمكنك تحميل كافة سجلات الجلسات الحالية ({sessions.length} جلسة) بصيغ متعددة متوافقة مع Excel أو برامج المحاسبة أو الطباعة الورقية.
          </p>

          <div className="space-y-2.5">
            {/* CSV Option */}
            <button
              onClick={downloadCSV}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all flex items-center justify-between text-right cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-teal-900">
                    تصدير إلى ملف Excel (CSV)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    جاهز ومرمز بترميز UTF-8 لدعم اللغة العربية بشكل سليم
                  </div>
                </div>
              </div>
            </button>

            {/* JSON Option */}
            <button
              onClick={downloadJSON}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all flex items-center justify-between text-right cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-teal-900">
                    نسخة احتياطية (JSON)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ملف بيانات متكامل لكافة الحقول وحالات السداد
                  </div>
                </div>
              </div>
            </button>

            {/* Print Option */}
            <button
              onClick={handlePrint}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all flex items-center justify-between text-right cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm group-hover:text-teal-900">
                    طباعة الجدول مباشرة
                  </div>
                  <div className="text-[11px] text-slate-500">
                    تنسيق مخصص للطباعة الورقية أو الحفظ كـ PDF
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
