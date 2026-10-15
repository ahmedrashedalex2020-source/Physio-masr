import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { SessionRecord } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  session: SessionRecord | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  session,
}) => {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-center font-bold text-slate-900 text-lg mb-2">
            تأكيد حذف الجلسة
          </h3>

          <p className="text-center text-xs text-slate-600 mb-4 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف جلسة العميل{' '}
            <strong className="text-slate-900 font-bold">{session.clientName}</strong> بتاريخ{' '}
            <span className="font-mono text-slate-900 font-semibold">{session.attendanceDate}</span> في تمام الساعة{' '}
            <span className="font-mono text-slate-900 font-semibold">{session.attendanceTime}</span>؟
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">الحالة:</span>
              <span className="font-medium text-slate-800">{session.condition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">القيمة:</span>
              <span className="font-bold text-slate-900">{session.totalPrice} جنيه</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-2 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/30 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
