import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, User, Phone, FileText, AlertCircle, Check } from 'lucide-react';
import { SessionRecord, PaymentStatus, PaymentMethod, ClientProfile } from '../types';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionData: any) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  initialData?: SessionRecord | null;
  existingClients: ClientProfile[];
  defaultClient?: { name: string; phone: string; condition: string } | null;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingClients,
  defaultClient,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [condition, setCondition] = useState('تأهيل خشونة الركبة والمفاصل');
  const [notes, setNotes] = useState('');
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceTime, setAttendanceTime] = useState('10:00');
  const [basePrice, setBasePrice] = useState(300);
  const [totalPrice, setTotalPrice] = useState(300);
  const [priceDetails, setPriceDetails] = useState('أساسي: 300 جنيه');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setClientName(initialData.clientName);
      setClientPhone(initialData.clientPhone || '');
      setCondition(initialData.condition);
      setNotes(initialData.notes || '');
      setAttendanceDate(initialData.attendanceDate);
      setAttendanceTime(initialData.attendanceTime || '10:00');
      setBasePrice(initialData.basePrice || 300);
      setTotalPrice(initialData.totalPrice || 300);
      setPriceDetails(initialData.priceDetails || 'أساسي: 300 جنيه');
      setPaymentStatus(initialData.paymentStatus || 'pending');
      setPaymentMethod(initialData.paymentMethod || 'cash');
    } else if (defaultClient) {
      setClientName(defaultClient.name);
      setClientPhone(defaultClient.phone || '');
      setCondition(defaultClient.condition || 'تأهيل خشونة الركبة والمفاصل');
      setNotes('');
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setAttendanceTime('10:00');
      setBasePrice(300);
      setTotalPrice(300);
      setPriceDetails('أساسي: 300 جنيه');
      setPaymentStatus('pending');
      setPaymentMethod('cash');
    } else {
      setClientName('');
      setClientPhone('');
      setCondition('تأهيل خشونة الركبة والمفاصل');
      setNotes('');
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setAttendanceTime('10:00');
      setBasePrice(300);
      setTotalPrice(300);
      setPriceDetails('أساسي: 300 جنيه');
      setPaymentStatus('pending');
      setPaymentMethod('cash');
    }
    setErrorMessage('');
  }, [initialData, defaultClient, isOpen]);

  if (!isOpen) return null;

  const handleClientSelect = (selectedName: string) => {
    setClientName(selectedName);
    const found = existingClients.find((c) => c.name === selectedName);
    if (found) {
      setClientPhone(found.phone === 'بدون هاتف' ? '' : found.phone);
      if (found.primaryCondition) {
        setCondition(found.primaryCondition);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setErrorMessage('يرجى كتابة أو اختيار اسم العميل');
      return;
    }
    if (!attendanceDate) {
      setErrorMessage('يرجى تحديد تاريخ الجلسة');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      ...(initialData ? { id: initialData.id, createdAt: initialData.createdAt } : {}),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() ? clientPhone.trim() : 'بدون هاتف',
      condition,
      notes: notes.trim() || undefined,
      attendanceDate,
      attendanceTime: attendanceTime || '10:00',
      basePrice: Number(basePrice) || 300,
      totalPrice: Number(totalPrice) || 300,
      priceDetails: priceDetails || `أساسي: ${basePrice} جنيه`,
      paymentStatus,
      paymentMethod,
    };

    try {
      const result = await onSave(payload);
      if (!result.success) {
        setErrorMessage(result.error || 'حدث خطأ أثناء حفظ الجلسة في قاعدة البيانات');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل الاتصال بقاعدة البيانات المركزية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {initialData ? 'تعديل بيانات الجلسة' : 'إضافة جلسة جديدة'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدخال وتحديث البيانات في قاعدة بيانات المركز مع منع التكرار
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Client Name & Quick select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              اسم العميل / المريض <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="اكتب اسم العميل بالكامل..."
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              />
              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-400">مرضى مسجلون:</span>
                {existingClients.slice(0, 5).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client.name)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors cursor-pointer"
                  >
                    {client.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الهاتف (أو اتركه فارغاً ليكون "بدون هاتف")
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="مثال: 01044241787"
                dir="ltr"
                className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 font-mono text-right"
              />
            </div>
          </div>

          {/* Condition Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              نوع الحالة / الإصابة <span className="text-rose-500">*</span>
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
            >
              <option value="تأهيل خشونة الركبة والمفاصل">تأهيل خشونة الركبة والمفاصل</option>
              <option value="علاج طبيعي للأطفال وتأهيل الحركة">
                علاج طبيعي للأطفال وتأهيل الحركة
              </option>
              <option value="تأهيل العمود الفقري والانزلاق الغضروفي">
                تأهيل العمود الفقري والانزلاق الغضروفي
              </option>
              <option value="علاج طبيعي للإصابات الرياضية">علاج طبيعي للإصابات الرياضية</option>
            </select>
          </div>

          {/* Notes / Special details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تفاصيل أو ملاحظات الجلسة (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: جلسة شد فقرات قطنية وتمرينات تقوية أو شراء حزام ركبة..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ الحضور <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                وقت الحضور <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={attendanceTime}
                onChange={(e) => setAttendanceTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                المبلغ الإجمالي (جنيه)
              </label>
              <input
                type="number"
                value={totalPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalPrice(val);
                  setBasePrice(val);
                  setPriceDetails(`أساسي: ${val} جنيه`);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              >
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="credit_card">بطاقة ائتمان</option>
              </select>
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              حالة السداد
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('pending')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  paymentStatus === 'pending'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>معلق / غير مدفوع</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>مدفوع بالكامل</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-sm shadow-teal-600/30 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ الحفظ في قاعدة البيانات...</span>
                </>
              ) : initialData ? (
                'حفظ التعديلات في قاعدة البيانات'
              ) : (
                'إضافة إلى قاعدة البيانات مباشرة'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
