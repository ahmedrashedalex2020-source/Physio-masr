import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, HelpCircle, ExternalLink, ShieldAlert } from 'lucide-react';

interface InstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstallSuccess();
      }
      setIsInstalling(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">تثبيت التطبيق على الهاتف الذكي</h3>
              <p className="text-teal-100 text-xs">يعمل كـ تطبيق حقيقي ومستقل على شاشتك الرئيسية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* App Preview Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <img src="/icon-192.svg" alt="App Icon" className="w-14 h-14 rounded-2xl shadow-sm" />
            <div>
              <div className="font-bold text-slate-900 text-base">مركز التأهيل والعلاج الطبيعي</div>
              <div className="text-xs text-slate-500">نظام إدارة العملاء والجلسات والحالات</div>
              <div className="text-[11px] text-teal-700 font-semibold mt-0.5">
                تطبيق ويب تقدمي (PWA) &bull; بدون إعلانات
              </div>
            </div>
          </div>

          {/* Native Install Button if prompt captured */}
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>{isInstalling ? 'جارٍ التثبيت...' : 'تثبيت التطبيق الآن بنقرة واحدة'}</span>
            </button>
          ) : (
            /* Manual Chrome Mobile Instructions */
            <div className="space-y-3">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-teal-800">
                <HelpCircle className="w-4 h-4" />
                <span>طريقة التثبيت المباشرة من متصفح الهاتف (Chrome):</span>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-700 list-decimal list-inside pr-1">
                <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed">
                  اضغط على <strong>قائمة النقاط الثلاث (⋮)</strong> في الزاوية العلوية للمتصفح.
                </li>
                <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed">
                  اختر من القائمة <strong>«إضافة إلى الشاشة الرئيسية»</strong> (أو <strong>«تثبيت التطبيق / Install App»</strong>).
                </li>
                <li className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 leading-relaxed">
                  اضغط على <strong>تثبيت (Install)</strong>، وسيظهر التطبيق فوراً بين تطبيقات هاتفك بأيقونته الرسمية.
                </li>
              </ol>
            </div>
          )}

          {/* Explanation for 403 Forbidden Error */}
          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>توضيح هام بخصوص خطأ 403 (That's an error):</span>
            </div>
            <p className="text-[12px] leading-relaxed text-amber-800/90">
              يحدث هذا الخطأ عندما يقوم متصفح كروم على الهاتف بفتح الرابط عبر حساب جوجل مختلف عن الحساب المالك للتطبيق، أو عند حظر ملفات المصادقة الخارجية.
            </p>
            <div className="pt-1 text-[11px] text-amber-900 font-semibold">
              الحل: افتح الرابط في المتصفح وتأكد من اختيار حساب: 
              <span className="font-mono bg-white/70 px-1.5 py-0.5 rounded border border-amber-300 mx-1">
                ahmedrashedalex2020@gmail.com
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
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
