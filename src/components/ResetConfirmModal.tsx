import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, X, Database } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-base">
              استعادة السجلات الأصلية في قاعدة البيانات
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <p className="text-center text-xs text-slate-600 mb-4 leading-relaxed">
            هل تريد إعادة ضبط قاعدة البيانات السحابية الموحدة (Firebase Firestore) واستعادة السجلات الأصلية المعتمدة (68 جلسة و17 ملف مريض بإجمالي 20,400 جنيه) مع إزالة أي سجلات تجريبية؟
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-6 font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">عدد الجلسات الأصلية:</span>
              <span className="font-bold text-slate-900">68 جلسة</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">عدد المرضى المعتمدين:</span>
              <span className="font-bold text-slate-900">17 مريض</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">إجمالي القيمة المعتمدة:</span>
              <span className="font-bold text-teal-700">20,400 جنيه</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isResetting}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={isResetting}
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'جارٍ الاستعادة...' : 'تأكيد الاستعادة'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
