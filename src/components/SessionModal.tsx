import React, { useState, useEffect } from 'react';
import { X, Phone, AlertCircle, Check } from 'lucide-react';
import { SessionRecord, PaymentStatus, PaymentMethod, ClientProfile } from '../types';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    sessionData: any
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  initialData?: SessionRecord | null;
  existingClients: ClientProfile[];
  defaultClient?: { name: string; phone: string; condition: string } | null;
}

const STANDARD_CONDITIONS = [
  'تأهيل خشونة الركبة والمفاصل',
  'علاج طبيعي للأطفال وتأهيل الحركة',
  'تأهيل العمود الفقري والانزلاق الغضروفي',
  'علاج طبيعي للإصابات الرياضية',
  'تأهيل ما بعد الكسور والعمليات الجراحية',
  'تأهيل الشلل النصفي وإصابات الأعصاب',
  'علاج طبيعي للعصب السابع والتهاب الأعصاب',
];

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
  const [isCustomCondition, setIsCustomCondition] = useState(false);
  const [customCondition, setCustomCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceTime, setAttendanceTime] = useState('10:00');
  const [basePrice, setBasePrice] = useState(300);
  const [extraPrice, setExtraPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(300);
  const [priceDetails, setPriceDetails] = useState('أساسي: 300 جنيه');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setClientName(initialData.clientName);
      setClientPhone(
        initialData.clientPhone === 'بدون هاتف' ? '' : initialData.clientPhone || ''
      );
      const cond = initialData.condition || 'تأهيل خشونة الركبة والمفاصل';
      if (STANDARD_CONDITIONS.includes(cond)) {
        setCondition(cond);
        setIsCustomCondition(false);
        setCustomCondition('');
      } else {
        setCondition('__custom__');
        setIsCustomCondition(true);
        setCustomCondition(cond);
      }
      setNotes(initialData.notes || '');
      setAttendanceDate(initialData.attendanceDate);
      setAttendanceTime(initialData.attendanceTime || '10:00');
      const bp = Number(initialData.basePrice) || 300;
      const tp = Number(initialData.totalPrice) || bp;
      setBasePrice(bp);
      setExtraPrice(Math.max(0, tp - bp));
      setTotalPrice(tp);
      setPriceDetails(initialData.priceDetails || `أساسي: ${tp} جنيه`);
      setPaymentStatus(initialData.paymentStatus || 'pending');
      setPaymentMethod(initialData.paymentMethod || 'cash');
    } else if (defaultClient) {
      setClientName(defaultClient.name);
      setClientPhone(defaultClient.phone === 'بدون هاتف' ? '' : defaultClient.phone || '');
      const cond = defaultClient.condition || 'تأهيل خشونة الركبة والمفاصل';
      if (STANDARD_CONDITIONS.includes(cond)) {
        setCondition(cond);
        setIsCustomCondition(false);
        setCustomCondition('');
      } else {
        setCondition('__custom__');
        setIsCustomCondition(true);
        setCustomCondition(cond);
      }
      setNotes('');
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setAttendanceTime('10:00');
      setBasePrice(300);
      setExtraPrice(0);
      setTotalPrice(300);
      setPriceDetails('أساسي: 300 جنيه');
      setPaymentStatus('pending');
      setPaymentMethod('cash');
    } else {
      setClientName('');
      setClientPhone('');
      setCondition('تأهيل خشونة الركبة والمفاصل');
      setIsCustomCondition(false);
      setCustomCondition('');
      setNotes('');
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setAttendanceTime('10:00');
      setBasePrice(300);
      setExtraPrice(0);
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
        if (STANDARD_CONDITIONS.includes(found.primaryCondition)) {
          setCondition(found.primaryCondition);
          setIsCustomCondition(false);
        } else {
          setCondition('__custom__');
          setIsCustomCondition(true);
          setCustomCondition(found.primaryCondition);
        }
      }
    }
  };

  const updatePriceBreakdown = (newBase: number, newExtra: number) => {
    const cleanBase = Math.max(0, newBase);
    const cleanExtra = Math.max(0, newExtra);
    const sum = cleanBase + cleanExtra;
    setBasePrice(cleanBase);
    setExtraPrice(cleanExtra);
    setTotalPrice(sum);
    if (cleanExtra > 0) {
      setPriceDetails(`أساسي: ${cleanBase} + إضافي: ${cleanExtra} جنيه`);
    } else {
      setPriceDetails(`أساسي: ${cleanBase} جنيه`);
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

    const finalCondition = isCustomCondition ? customCondition.trim() : condition;
    if (!finalCondition) {
      setErrorMessage('يرجى تحديد أو كتابة نوع الحالة / التشخيص');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      ...(initialData ? { id: initialData.id, createdAt: initialData.createdAt } : {}),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() ? clientPhone.trim() : 'بدون هاتف',
      condition: finalCondition,
      notes: notes.trim() || undefined,
      attendanceDate,
      attendanceTime: attendanceTime || '10:00',
      basePrice: Number(basePrice) >= 0 ? Number(basePrice) : 300,
      totalPrice: Number(totalPrice) >= 0 ? Number(totalPrice) : 300,
      priceDetails: priceDetails || `أساسي: ${totalPrice} جنيه`,
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {initialData ? 'تعديل بيانات الجلسة' : 'إضافة جلسة جديدة'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
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
                <span className="text-[11px] text-slate-400">اختيار سريع:</span>
                {existingClients.slice(0, 6).map((client) => (
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
                className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 font-mono tabular-nums text-right"
              />
            </div>
          </div>

          {/* Condition Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              نوع الحالة / الإصابة <span className="text-rose-500">*</span>
            </label>
            <select
              value={isCustomCondition ? '__custom__' : condition}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomCondition(true);
                  setCondition('__custom__');
                } else {
                  setIsCustomCondition(false);
                  setCondition(e.target.value);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
            >
              {STANDARD_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">حالة أخرى (كتابة تشخيص مخصص)...</option>
            </select>

            {isCustomCondition && (
              <input
                type="text"
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="اكتب نوع الحالة أو التشخيص المخصص..."
                required
                className="mt-2 w-full px-3 py-2 text-sm bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
              />
            )}
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
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 font-mono tabular-nums"
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
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                سعر الجلسة الأساسي
              </label>
              <input
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => updatePriceBreakdown(Number(e.target.value), extraPrice)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                إضافات / مستلزمات
              </label>
              <input
                type="number"
                min={0}
                value={extraPrice}
                onChange={(e) => updatePriceBreakdown(basePrice, Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
              >
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="credit_card">بطاقة ائتمان</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="text-slate-600">{priceDetails}</span>
            <span className="font-bold text-teal-800 font-mono tabular-nums">
              الإجمالي النهائي: {totalPrice} جنيه
            </span>
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

          </div>

          {/* Pinned Footer Actions */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial justify-center px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-sm shadow-teal-600/30 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جارٍ الحفظ...</span>
                </>
              ) : initialData ? (
                'حفظ التعديلات'
              ) : (
                'حفظ وإضافة الجلسة'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
