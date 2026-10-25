import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  CreditCard,
  Banknote,
  Building2,
  Activity,
  Users,
  ExternalLink,
  Check,
  Wrench,
  FolderArchive,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { SessionRecord, ClientProfile, MonthlyArchive } from '../types';
import { StorageService, DiagnosticCheckResult, normalizeArabic } from '../services/storage';

interface FinancialsAndDiagnosticsViewProps {
  sessions: SessionRecord[];
  clients: ClientProfile[];
  archives: MonthlyArchive[];
  onSelectClientToFilter: (clientName: string) => void;
  onSelectArchiveToFilter: (archiveId: string) => void;
  onReopenArchive: (archiveId: string) => Promise<void>;
  onOpenCloseMonthModal: () => void;
  onToggleStatus: (id: string) => void;
}

export const FinancialsAndDiagnosticsView: React.FC<FinancialsAndDiagnosticsViewProps> = ({
  sessions,
  clients,
  archives,
  onSelectClientToFilter,
  onSelectArchiveToFilter,
  onReopenArchive,
  onOpenCloseMonthModal,
  onToggleStatus,
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheckResult[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string>('');
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const results = await StorageService.runDatabaseDiagnostics();
      setDiagnostics(results);
      setLastRunTime(new Date().toLocaleTimeString('ar-EG'));
    } finally {
      setIsRunningDiag(false);
    }
  };

  useEffect(() => {
    handleRunDiagnostics();
  }, []);

  const openSessionsCount = useMemo(
    () => sessions.filter((s) => !s.archiveId).length,
    [sessions]
  );

  // Financial Breakdowns
  const metrics = useMemo(() => {
    const totalAmount = sessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const paidSessions = sessions.filter((s) => s.paymentStatus === 'paid');
    const pendingSessions = sessions.filter((s) => s.paymentStatus === 'pending');

    const paidAmount = paidSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const pendingAmount = pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

    // By Payment Method
    const byMethod = {
      cash: { count: 0, total: 0, paid: 0 },
      bank_transfer: { count: 0, total: 0, paid: 0 },
      credit_card: { count: 0, total: 0, paid: 0 },
    };

    sessions.forEach((s) => {
      const m = byMethod[s.paymentMethod] || byMethod.cash;
      const val = Number(s.totalPrice) || 0;
      m.count += 1;
      m.total += val;
      if (s.paymentStatus === 'paid') m.paid += val;
    });

    // By Condition
    const condMap = new Map<string, { condition: string; count: number; total: number; pending: number }>();
    sessions.forEach((s) => {
      const cond = s.condition || 'غير محدد';
      const cur = condMap.get(cond) || { condition: cond, count: 0, total: 0, pending: 0 };
      const val = Number(s.totalPrice) || 0;
      cur.count += 1;
      cur.total += val;
      if (s.paymentStatus === 'pending') cur.pending += val;
      condMap.set(cond, cur);
    });
    const byCondition = Array.from(condMap.values()).sort((a, b) => b.total - a.total);

    // Clients with highest pending balances
    const clientBalances = clients
      .map((c) => {
        const clientSessions = sessions.filter(
          (s) => normalizeArabic(s.clientName) === normalizeArabic(c.name)
        );
        const pendingList = clientSessions.filter((s) => s.paymentStatus === 'pending');
        const pendingSum = pendingList.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
        const totalSum = clientSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
        return {
          client: c,
          totalSessions: clientSessions.length,
          pendingSessionsCount: pendingList.length,
          firstPendingSessionId: pendingList[0]?.id,
          pendingSum,
          totalSum,
        };
      })
      .filter((item) => item.totalSessions > 0)
      .sort((a, b) => b.pendingSum - a.pendingSum || b.totalSum - a.totalSum);

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      paidCount: paidSessions.length,
      pendingCount: pendingSessions.length,
      collectionRate,
      byMethod,
      byCondition,
      clientBalances,
    };
  }, [sessions, clients]);

  const auditImprovements = [
    {
      title: 'تقفيل حساب الشهر وأرشفته وبداية شهر جديد',
      desc: 'إمكانية تقفيل حساب الشهر الحالي بضغطة زر وأرشفته سحابياً في Firestore لتبدأ لوحة الإحصائيات ومتابعة الشهر الجديد من الصفر، مع إمكانية الرجوع لأي شهر سابق من الفلتر في أي وقت.',
    },
    {
      title: 'ربط سحابي لحظي موحد (Firebase Firestore) وإلغاء الحفظ المحلي',
      desc: 'تم إزالة localStorage والتخزين المؤقت، والاعتماد الكلي على Firestore مع مزامنة صامتة (Silent Diffing) تمنع الوميض والتحديث المزعج.',
    },
    {
      title: 'حماية الطابع الزمني (createdAt) عند استعادة وتحديث السجلات',
      desc: 'تم إصلاح توافق دالة استعادة الـ 68 جلسة مع قواعد أمان Firestore الصارمة للحقول الثابتة لضمان عدم رفض الدفعات السحابية (Batch Commits).',
    },
    {
      title: 'تفعيل فلاتر حالة السداد والتاريخ والفرز التفاعلي للجدول',
      desc: 'تم إضافة فلتر حالة السداد (مدفوع / معلق) وفلتر النطاق الزمني (من تاريخ - إلى تاريخ) وإمكانية ترتيب الجدول حسب التاريخ أو الاسم أو القيمة.',
    },
    {
      title: 'إدارة كاملة لملفات المرضى (إضافة وتعديل وحذف مباشر)',
      desc: 'تم دعم إضافة مريض جديد وتعديل رقم الهاتف والتشخيص والملاحظات الطبية مباشرة من دليل المرضى مع تحديث تلقائي لتواريخ الزيارات.',
    },
    {
      title: 'استبدال نوافذ المتصفح التقليدية بنوافذ تأكيد مدمجة',
      desc: 'تم استبدال window.confirm التي قد تتعطل على الموبايل ووضع التطبيق المستقل (PWA) بنافذة تأكيد مخصصة تعمل على كافة الأجهزة.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section 0: Monthly Archives & Account Closing Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                سجل أرشيف الشهور وتقفيل الحسابات الشهرية ({archives.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                جميع الشهور والفترات المحاسبية التي تم تقفيلها وأرشفتها في قاعدة البيانات السحابية
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCloseMonthModal}
            disabled={openSessionsCount === 0}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Archive className="w-3.5 h-3.5 text-teal-400" />
            <span>تقفيل حساب الشهر الحالي ({openSessionsCount} جلسة مفتوحة)</span>
          </button>
        </div>

        {archives.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            لا توجد شهور مؤرشفة حتى الآن. يمكنك تقفيل حساب الشهر الحالي وأرشفته في أي وقت من زر «تقفيل حساب الشهر وبداية شهر جديد».
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
            {archives.map((arch) => (
              <div
                key={arch.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{arch.title}</h3>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      {new Date(arch.closedAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    الفترة: من {arch.startDate} إلى {arch.endDate}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/70 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-sans">الإجمالي</span>
                      <strong className="text-slate-900">
                        {arch.totalRevenue.toLocaleString('en-US')} ج.م ({arch.totalSessions})
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[11px] font-sans">المحصل</span>
                      <strong className="text-emerald-700">
                        {arch.paidRevenue.toLocaleString('en-US')} ج.م ({arch.paidCount})
                      </strong>
                    </div>
                    <div>
                      <span className="text-amber-700 block text-[11px] font-sans">المعلق</span>
                      <strong className="text-amber-700">
                        {arch.pendingRevenue.toLocaleString('en-US')} ج.م ({arch.pendingCount})
                      </strong>
                    </div>
                  </div>

                  {arch.notes && (
                    <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-lg border border-slate-200/70">
                      ملاحظات التقفيل: {arch.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={async () => {
                      setReopeningId(arch.id);
                      try {
                        await onReopenArchive(arch.id);
                      } finally {
                        setReopeningId(null);
                      }
                    }}
                    disabled={reopeningId === arch.id}
                    title="إلغاء أرشفة هذا الشهر وإعادة جلساته إلى الحساب المفتوح"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {reopeningId === arch.id ? 'جارٍ الإعادة...' : 'إعادة فتح الحساب'}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectArchiveToFilter(arch.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>استعراض جلسات وإحصائيات الشهر</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 1: Live Database Diagnostics & Rules Verification */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                فحص واختبار قاعدة البيانات السحابية (Firestore Live Diagnostics)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختبار فعلي مباشر للاتصال، قواعد الأمان (firestore.rules)، عمليات الإضافة والتعديل والحذف، وتطابق السجلات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastRunTime && (
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                آخر فحص: {lastRunTime}
              </span>
            )}
            <button
              onClick={handleRunDiagnostics}
              disabled={isRunningDiag}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
              <span>{isRunningDiag ? 'جارٍ اختبار القاعدة...' : 'إعادة فحص قاعدة البيانات الآن'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {diagnostics.map((check) => (
            <div
              key={check.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                check.status === 'passed'
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : check.status === 'warning'
                  ? 'bg-amber-50/40 border-amber-200/80'
                  : 'bg-rose-50/40 border-rose-200/80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {check.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : check.status === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{check.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{check.detail}</p>
                </div>
              </div>

              {check.latencyMs !== undefined && (
                <span className="text-[11px] font-mono tabular-nums text-emerald-700 font-semibold shrink-0">
                  {check.latencyMs} ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Financial Overview & Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collection Progress & Payment Methods (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                التحليل المالي ومؤشر التحصيل الفعلي
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              نسبة التحصيل: {metrics.collectionRate}%
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-emerald-700 font-bold font-mono tabular-nums">
                المحصل: {metrics.paidAmount.toLocaleString('en-US')} ج.م ({metrics.paidCount} جلسة)
              </span>
              <span className="text-amber-700 font-bold font-mono tabular-nums">
                المعلق: {metrics.pendingAmount.toLocaleString('en-US')} ج.م ({metrics.pendingCount} جلسة)
              </span>
            </div>
            <div className="w-full h-3 bg-amber-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${metrics.collectionRate}%` }}
              />
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2.5">
              توزيع الإيرادات حسب وسيلة الدفع:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                  <span className="font-semibold">الدفع النقدي (كاش)</span>
                  <Banknote className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {metrics.byMethod.cash.total.toLocaleString('en-US')} ج.م
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  {metrics.byMethod.cash.count} جلسة · محصل {metrics.byMethod.cash.paid.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                  <span className="font-semibold">تحويل بنكي / محفظة</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {metrics.byMethod.bank_transfer.total.toLocaleString('en-US')} ج.م
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  {metrics.byMethod.bank_transfer.count} جلسة · محصل {metrics.byMethod.bank_transfer.paid.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
                  <span className="font-semibold">بطاقة ائتمان / فيزا</span>
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {metrics.byMethod.credit_card.total.toLocaleString('en-US')} ج.م
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  {metrics.byMethod.credit_card.count} جلسة · محصل {metrics.byMethod.credit_card.paid.toLocaleString('en-US')} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* Condition Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2.5">
              توزيع الجلسات والإيرادات حسب التخصص الطبي:
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {metrics.byCondition.map((item) => (
                <div
                  key={item.condition}
                  className="p-3 bg-white hover:bg-slate-50/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">{item.condition}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                    <span className="text-slate-500">{item.count} جلسة</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-slate-900">
                      {item.total.toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clients Balance & Pending Accounts (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  كشف حسابات المرضى والمديونيات المعلقة
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {metrics.clientBalances.length} مريض
              </span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {metrics.clientBalances.map((row) => (
                <div
                  key={row.client.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {row.client.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      إجمالي {row.totalSessions} جلسات ({row.totalSum.toLocaleString('en-US')} ج.م)
                      {row.pendingSum > 0 && (
                        <span className="text-amber-700 font-bold">
                          {' '}· معلق: {row.pendingSum.toLocaleString('en-US')} ج.م
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {row.firstPendingSessionId && (
                      <button
                        onClick={() => onToggleStatus(row.firstPendingSessionId!)}
                        title="تحصيل جلسة معلقة لهذا المريض"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Check className="w-3 h-3" />
                        <span>تحصيل جلسة</span>
                      </button>
                    )}
                    <button
                      onClick={() => onSelectClientToFilter(row.client.name)}
                      title="عرض جميع جلسات المريض"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Comprehensive Technical Audit & Implemented Improvements Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
          <Wrench className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">
            التقييم الشامل للأخطاء والعيوب والتحسينات التي تم تنفيذها في النظام
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {auditImprovements.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
