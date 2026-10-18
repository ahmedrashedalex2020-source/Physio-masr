import React, { useState } from 'react';
import { Smartphone, Download, X, Check, HelpCircle, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';

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

  const handleCloseAndDismiss = () => {
    try {
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
              <Smartphone className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <h3 className="font-bold text-base">حفظ وتثبيت النظام على الهاتف</h3>
              <p className="text-teal-100 text-xs">حفظ صفحة السيستم كـ تطبيق مستقل على شاشة هاتفك</p>
            </div>
          </div>
          <button
            onClick={handleCloseAndDismiss}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* App Preview Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <img
              src="/icon-192.png"
              alt="App Icon"
              className="w-16 h-16 rounded-2xl shadow-md border border-teal-600/20 shrink-0"
            />
            <div>
              <div className="font-bold text-slate-900 text-base">مركز التأهيل والعلاج الطبيعي</div>
              <div className="text-xs text-slate-500">نظام إدارة العملاء والجلسات والحسابات</div>
              <div className="inline-flex items-center gap-1 text-[11px] text-teal-800 font-bold bg-teal-100/70 px-2 py-0.5 rounded-md mt-1">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>تطبيق هاتف معتمد (PWA) &bull; شاشة كاملة</span>
              </div>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span className="font-semibold text-[11px]">يفتح مباشرة كأيقونة على الشاشة الرئيسية</span>
            </div>
            <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-[11px]">بدون شريط المتصفح وبدون إعادة كتابة الروابط</span>
            </div>
          </div>

          {/* Native 1-Click Install Button if supported */}
          {deferredPrompt ? (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                <span>{isInstalling ? 'جارٍ الحفظ على الهاتف...' : 'حفظ وتثبيت التطبيق على هاتفك الآن (بنقرة واحدة)'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                سيظهر لك تنبيه نظام أندرويد لتأكيد إضافة الأيقونة لشاشتك
              </p>
            </div>
          ) : (
            /* Direct Chrome Mobile Instructions */
            <div className="space-y-2.5 pt-1">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-teal-800">
                <HelpCircle className="w-4 h-4" />
                <span>خطوات الحفظ المباشر على شاشة هاتفك (Chrome):</span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">اضغط على زر النقاط الثلاث (⋮)</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      في أعلى يسار أو يمين متصفح Chrome على الهاتف.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">
                      اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق»
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      (Add to Home screen / Install app).
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">اضغط «إضافة / تثبيت»</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      ستظهر أيقونة المركز على شاشة الهاتف الرئيسية، لتفتح صفحة النظام مباشرة في أي وقت كأي تطبيق عادي وبشاشة كاملة.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standalone guarantee note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              يحفظ التطبيق جلسة دخولك وبيانات المرضى والمدفوعات لتكون جاهزة دائماً فور فتح التطبيق.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">مركز التأهيل &bull; PWA V2</span>
          <button
            onClick={handleCloseAndDismiss}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
