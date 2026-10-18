import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2,
  DollarSign,
  Trophy,
  Sparkles,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  HeartPulse,
  Activity,
  Bed,
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt,
  Search,
  ChevronRight,
  UserCheck,
  Star,
  Flame,
  Award,
  Stethoscope,
  Smile,
  ShieldCheck,
  Phone,
  Trash2,
  Edit3
} from 'lucide-react';
import { SessionRecord, ClientProfile } from '../types';
import { User } from '../services/auth';
import { normalizeArabic } from '../services/storage';

interface ClinicGameViewProps {
  sessions: SessionRecord[];
  clients: ClientProfile[];
  currentUser: User | null;
  onToggleStatus: (id: string) => void | Promise<any>;
  onSaveSession: (sessionData: any) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onEditSession: (session: SessionRecord) => void;
  onDeleteSession: (session: SessionRecord) => void;
  onOpenAddModal: () => void;
  onSwitchToClassic: () => void;
}

interface FloatingReward {
  id: string;
  x: number;
  y: number;
  amount: number;
  xp: number;
}

export const ClinicGameView: React.FC<ClinicGameViewProps> = ({
  sessions,
  clients,
  currentUser,
  onToggleStatus,
  onSaveSession,
  onEditSession,
  onDeleteSession,
  onOpenAddModal,
  onSwitchToClassic,
}) => {
  // Floating rewards queue for collection animations
  const [rewards, setRewards] = useState<FloatingReward[]>([]);
  const [selectedClientForInspection, setSelectedClientForInspection] = useState<ClientProfile | null>(null);
  const [billingSearch, setBillingSearch] = useState('');
  const [activeRoomAction, setActiveRoomAction] = useState<{ room: string; message: string } | null>(null);

  // Financial calculations from real database
  const totalSessions = sessions.length;
  const paidSessions = useMemo(() => sessions.filter((s) => s.paymentStatus === 'paid'), [sessions]);
  const pendingSessions = useMemo(() => sessions.filter((s) => s.paymentStatus === 'pending'), [sessions]);

  const paidValue = useMemo(
    () => paidSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0),
    [paidSessions]
  );
  const pendingValue = useMemo(
    () => pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0),
    [pendingSessions]
  );

  // Gamification metrics calculated from actual database
  const totalXp = paidSessions.length * 50 + totalSessions * 10;
  const clinicLevel = Math.max(1, Math.floor(totalXp / 250) + 1);
  const xpInCurrentLevel = totalXp % 250;
  const levelProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / 250) * 100));
  const satisfactionRate = Math.min(99, Math.max(88, 85 + Math.floor(paidSessions.length / 3)));

  // Filter pending invoices for Cashier desk
  const filteredPendingSessions = useMemo(() => {
    if (!billingSearch.trim()) return pendingSessions;
    const q = billingSearch.trim().toLowerCase();
    return pendingSessions.filter(
      (s) =>
        s.clientName.toLowerCase().includes(q) ||
        (s.clientPhone && s.clientPhone.includes(q)) ||
        s.condition.toLowerCase().includes(q)
    );
  }, [pendingSessions, billingSearch]);

  // Handle invoice collection with animation
  const handleCollectInvoice = (e: React.MouseEvent, session: SessionRecord) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newReward: FloatingReward = {
      id: `rew-${Date.now()}-${Math.random()}`,
      x: rect.left + rect.width / 2,
      y: rect.top,
      amount: session.totalPrice || 300,
      xp: 50,
    };

    setRewards((prev) => [...prev, newReward]);
    setTimeout(() => {
      setRewards((prev) => prev.filter((r) => r.id !== newReward.id));
    }, 1600);

    // Call real database toggle
    onToggleStatus(session.id);
  };

  // Quick batch collect first 3 pending invoices
  const handleFastBatchCollect = () => {
    const toCollect = pendingSessions.slice(0, 3);
    if (toCollect.length === 0) return;

    toCollect.forEach((s, idx) => {
      setTimeout(() => {
        onToggleStatus(s.id);
      }, idx * 150);
    });
  };

  // Quick admission from Waiting Room (starts a new session today)
  const handleQuickAdmitPatient = (client: ClientProfile) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newSessionPayload = {
      clientName: client.name,
      clientPhone: client.phone || 'بدون هاتف',
      condition: client.primaryCondition || 'تأهيل خشونة الركبة والمفاصل',
      notes: `جلسة محاكاة سريعة بدأت عبر لوحة المدير`,
      attendanceDate: dateStr,
      attendanceTime: timeStr,
      basePrice: 300,
      totalPrice: 300,
      priceDetails: 'أساسي: 300 جنيه',
      paymentStatus: 'pending',
      paymentMethod: 'cash',
    };

    onSaveSession(newSessionPayload);
  };

  // Trigger interactive room booster
  const handleRoomBooster = (roomName: string, actionDesc: string) => {
    setActiveRoomAction({ room: roomName, message: actionDesc });
    setTimeout(() => {
      setActiveRoomAction(null);
    }, 2500);
  };

  // Segregate real sessions into specialized treatment rooms
  const pediatricSessions = useMemo(
    () => sessions.filter((s) => s.condition.includes('أطفال') || s.condition.includes('الحركة')),
    [sessions]
  );
  const kneeSessions = useMemo(
    () => sessions.filter((s) => s.condition.includes('ركبة') || s.condition.includes('مفاصل')),
    [sessions]
  );
  const spineSessions = useMemo(
    () => sessions.filter((s) => s.notes?.includes('فقرات') || s.notes?.includes('حزام') || s.condition.includes('عمود')),
    [sessions]
  );

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Floating Rewards Animation Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {rewards.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, scale: 0.8, x: r.x - 60, y: r.y }}
              animate={{ opacity: 0, scale: 1.3, y: r.y - 120 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute flex flex-col items-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-4 py-1.5 rounded-full shadow-2xl border-2 border-emerald-300 pointer-events-none"
            >
              <span className="text-sm font-extrabold flex items-center gap-1">
                +{r.amount} جنيه 💰
              </span>
              <span className="text-[10px] text-amber-300 font-bold">
                +{r.xp} XP 🌟
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* A) Manager HUD Header (شريط حالة المدير) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Manager Badge & Level Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900/90 rounded-2xl flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-purple-300" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-slate-900 shadow-xs flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-slate-950" />
                <span>Lv.{clinicLevel}</span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  {currentUser?.name || 'المدير العام د. مي علاء'}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  مدير المنشأة الطبية
                </span>
              </div>

              {/* Level XP Progress Bar */}
              <div className="mt-2 flex items-center gap-2.5">
                <div className="w-36 sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgressPercent}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-[11px] font-mono text-purple-200">
                  {totalXp} XP (المستوى {clinicLevel})
                </span>
              </div>
            </div>
          </div>

          {/* Real Treasury Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Treasury (Paid Cash) */}
            <div className="bg-slate-800/80 backdrop-blur-xs border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                <span>الخزينة المحصلة</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {paidValue.toLocaleString()} <span className="text-xs font-semibold text-emerald-300">ج.م</span>
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-0.5">
                تم تحصيل {paidSessions.length} جلسة
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="bg-slate-800/80 backdrop-blur-xs border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                <span>المبالغ المعلقة</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                {pendingValue.toLocaleString()} <span className="text-xs font-semibold text-amber-300">ج.م</span>
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">
                {pendingSessions.length} فاتورة بانتظار التحصيل
              </div>
            </div>

            {/* Patient Satisfaction */}
            <div className="bg-slate-800/80 backdrop-blur-xs border border-indigo-500/30 rounded-xl p-3 col-span-2 sm:col-span-1 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                <span>رضا المرضى</span>
                <Smile className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-black text-indigo-300 font-mono mt-1">
                %{satisfactionRate}
              </div>
              <div className="text-[10px] text-indigo-200/80 mt-0.5">
                تقييم ممتاز للعيادة
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Booster Notification Alert */}
      <AnimatePresence>
        {activeRoomAction && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border border-purple-400/40 rounded-xl text-white text-xs flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>
                <strong>{activeRoomAction.room}:</strong> {activeRoomAction.message}
              </span>
            </div>
            <span className="text-[10px] bg-purple-500/40 px-2 py-0.5 rounded text-purple-200 font-bold">
              نشط الآن ⚡
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B) Interactive Clinic Floor Plan (خريطة العيادة التفاعلية) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Waiting Lounge + Treatment Rooms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Zone 1: Waiting Lounge & Reception (صالة الانتظار والاستقبال) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    المنطقة 1: صالة الانتظار ومكتب الاستقبال
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    المرضى المترددون على العيادة بانتظار بدء الجلسات الجديدة
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {clients.length} مريض مسجل
              </span>
            </div>

            {/* Reception Desk & Waiting Chairs View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {clients.slice(0, 6).map((client, idx) => {
                const avatarColors = [
                  'from-rose-500 to-pink-600',
                  'from-blue-500 to-indigo-600',
                  'from-emerald-500 to-teal-600',
                  'from-amber-500 to-orange-600',
                  'from-purple-500 to-violet-600',
                  'from-teal-500 to-cyan-600',
                ];
                const bgGradient = avatarColors[idx % avatarColors.length];

                return (
                  <motion.div
                    key={client.id}
                    whileHover={{ y: -3 }}
                    className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${bgGradient} text-white font-bold flex items-center justify-center shadow-xs text-xs`}
                        >
                          {client.name.slice(0, 2)}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {client.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono block truncate">
                            {client.phone}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200/70 mb-3 truncate">
                        {client.primaryCondition}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickAdmitPatient(client)}
                        title="إدخال لغرفة الكشف وبدء جلسة جديدة اليوم"
                        className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>بدء جلسة</span>
                      </button>

                      <button
                        onClick={() => setSelectedClientForInspection(client)}
                        title="فحص السجل والتاريخ الطبي"
                        className="py-1.5 px-2 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                      >
                        ملف
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Zone 2: Specialized Treatment Rooms (غرف العلاج التخصصية) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-slate-900 text-sm">
                  المنطقة 2: غرف ووحدات العلاج الفيزيائي التخصصية
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                جلسات قيد العلاج والتمارين
              </span>
            </div>

            {/* 3 Interactive Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Room 1: Pediatric Rehab Unit */}
              <div className="bg-gradient-to-b from-blue-50/60 to-white rounded-2xl p-4 border border-blue-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      غرفة 1
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {pediatricSessions.length} جلسة
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    وحدة تأهيل الأطفال وتأهيل الحركة
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    أجهزة التوازن الحركي والتكامل الحسي للأطفال
                  </p>

                  {/* Progress bar representing active physical therapy */}
                  <div className="p-2.5 bg-white rounded-xl border border-blue-100 mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-blue-900 mb-1">
                      <span>جلسات نشطة</span>
                      <span>85% تقدم</span>
                    </div>
                    <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-blue-600 h-full rounded-full"
                        animate={{ width: ['40%', '85%', '60%', '85%'] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                      />
                    </div>
                  </div>

                  {/* Patient Preview in this unit */}
                  <div className="space-y-1.5 mb-3">
                    {pediatricSessions.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="text-[11px] p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">
                          {s.clientName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.attendanceTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleRoomBooster(
                      'وحدة تأهيل الأطفال',
                      'تم تنشيط أجهزة التوازن وتفعيل جلسات الحركات الدقيقة بنجاح!'
                    )
                  }
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-yellow-300" />
                  <span>تنشيط وحدة الأطفال</span>
                </button>
              </div>

              {/* Room 2: Knee & Joint Rehab Unit */}
              <div className="bg-gradient-to-b from-teal-50/60 to-white rounded-2xl p-4 border border-teal-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                      غرفة 2
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {kneeSessions.length} جلسة
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    وحدة خشونة الركبة والمفاصل
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    الموجات فوق الصوتية والكمادات والعلاج اليدوي
                  </p>

                  <div className="p-2.5 bg-white rounded-xl border border-teal-100 mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-teal-900 mb-1">
                      <span>أجهزة الموجات</span>
                      <span>92% جاهزية</span>
                    </div>
                    <div className="w-full bg-teal-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-teal-600 h-full rounded-full"
                        animate={{ width: ['60%', '92%', '75%', '92%'] }}
                        transition={{ repeat: Infinity, duration: 3.5 }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {kneeSessions.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="text-[11px] p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">
                          {s.clientName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.attendanceTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleRoomBooster(
                      'وحدة خشونة الركبة',
                      'تم إطلاق بروتوكول العلاج الحراري وجلسات تقوية عضلات المفصل!'
                    )
                  }
                  className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-orange-300" />
                  <span>تنشيط بروتوكول الركبة</span>
                </button>
              </div>

              {/* Room 3: Spine & Posture Rehab Unit */}
              <div className="bg-gradient-to-b from-purple-50/60 to-white rounded-2xl p-4 border border-purple-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                      غرفة 3
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {spineSessions.length} جلسة
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mb-1">
                    وحدة العمود الفقري والتأهيل
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    شد فقرات قطنية وتمرينات تقوية الجذع
                  </p>

                  <div className="p-2.5 bg-white rounded-xl border border-purple-100 mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-purple-900 mb-1">
                      <span>سرير الشد</span>
                      <span>نشط ومستقر</span>
                    </div>
                    <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-purple-600 h-full rounded-full"
                        animate={{ width: ['50%', '80%', '65%', '80%'] }}
                        transition={{ repeat: Infinity, duration: 4.5 }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {spineSessions.slice(0, 2).map((s) => (
                      <div
                        key={s.id}
                        className="text-[11px] p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">
                          {s.clientName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.attendanceTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleRoomBooster(
                      'وحدة العمود الفقري',
                      'تم فحص واستقرار أجهزة شد الفقرات وتجهيز أحزمة الدعم القطنية!'
                    )
                  }
                  className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Activity className="w-3 h-3 text-purple-200" />
                  <span>تنشيط سرير الشد</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Cashier & Billing Desk (مكتب الخزينة والحسابات) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    المنطقة 3: الخزينة والحسابات
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تحصيل الفواتير المعلقة بضغطة زر
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {pendingSessions.length} معلقة
              </span>
            </div>

            {/* Quick Search in pending invoices */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={billingSearch}
                onChange={(e) => setBillingSearch(e.target.value)}
                placeholder="بحث في الفواتير المعلقة..."
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Batch collect prompt */}
            {pendingSessions.length > 0 && (
              <button
                onClick={handleFastBatchCollect}
                className="mb-3 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>⚡ تحصيل سريع لأول 3 فواتير</span>
              </button>
            )}

            {/* Invoices List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {filteredPendingSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">لا توجد فواتير معلقة حالياً</p>
                  <p className="text-[11px] mt-0.5">تم تحصيل جميع المستحقات بنجاح!</p>
                </div>
              ) : (
                filteredPendingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs">
                          {session.clientName}
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-xs">
                          {session.totalPrice} جنيه
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 truncate mb-1">
                        {session.condition}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-2">
                        <span>{session.attendanceDate}</span>
                        <span>{session.attendanceTime}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleCollectInvoice(e, session)}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>تحصيل {session.totalPrice} ج.م الآن (+50 XP)</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* C) Manager Power Tools Dock (شريط أدوات المدير التفاعلي بالأسفل) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2 sm:gap-4 max-w-2xl w-[94%] justify-around">
        {/* Tool 1: New Case */}
        <button
          onClick={onOpenAddModal}
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="text-[11px] sm:text-xs">استقبال حالة جديدة</span>
        </button>

        {/* Tool 2: Quick Batch Collect */}
        <button
          onClick={handleFastBatchCollect}
          disabled={pendingSessions.length === 0}
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span className="text-[11px] sm:text-xs">تحصيل سريع</span>
        </button>

        {/* Tool 3: Client Inspection */}
        <button
          onClick={() => {
            if (clients.length > 0) {
              setSelectedClientForInspection(clients[0]);
            }
          }}
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          <span className="text-[11px] sm:text-xs">فحص ملف مريض</span>
        </button>

        {/* Tool 4: Return to Classic System */}
        <button
          onClick={onSwitchToClassic}
          className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-600 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-[11px] sm:text-xs">النظام الكلاسيكي</span>
        </button>
      </div>

      {/* Patient Inspection Modal */}
      {selectedClientForInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-base">
                  الملف الطبي للمريض: {selectedClientForInspection.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClientForInspection(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الهاتف:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedClientForInspection.phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">التشخيص الأساسي:</span>
                  <span className="font-bold text-teal-800">
                    {selectedClientForInspection.primaryCondition}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2">
                  سجل الجلسات المسجلة لهذا المريض في قاعدة البيانات:
                </h4>
                <div className="space-y-2">
                  {sessions
                    .filter(
                      (s) =>
                        normalizeArabic(s.clientName) ===
                        normalizeArabic(selectedClientForInspection.name)
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {s.attendanceDate} - {s.attendanceTime}
                          </div>
                          <div className="text-[11px] text-slate-500">{s.condition}</div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.paymentStatus === 'paid' ? 'مدفوع' : 'معلق / غير مدفوع'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedClientForInspection(null);
                              onEditSession(s);
                            }}
                            className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                            title="تعديل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClientForInspection(null);
                              onDeleteSession(s);
                            }}
                            className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClientForInspection(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
