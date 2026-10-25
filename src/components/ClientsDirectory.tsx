import React, { useState } from 'react';
import {
  Users,
  Phone,
  Plus,
  ExternalLink,
  Search,
  Activity,
  Edit3,
  Trash2,
  X,
  MessageCircle,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import { ClientProfile, SessionRecord } from '../types';
import { normalizeArabic } from '../services/storage';

interface ClientsDirectoryProps {
  clients: ClientProfile[];
  sessions: SessionRecord[];
  onSelectClientToFilter: (clientName: string) => void;
  onAddSessionForClient: (clientName: string, clientPhone: string, condition: string) => void;
  onSaveClient: (
    clientData: Partial<ClientProfile> & { name: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteClient: (client: ClientProfile) => Promise<void>;
}

export const ClientsDirectory: React.FC<ClientsDirectoryProps> = ({
  clients,
  sessions,
  onSelectClientToFilter,
  onAddSessionForClient,
  onSaveClient,
  onDeleteClient,
}) => {
  const [search, setSearch] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('تأهيل خشونة الركبة والمفاصل');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openAddClient = () => {
    setEditingClient(null);
    setClientName('');
    setClientPhone('');
    setPrimaryCondition('تأهيل خشونة الركبة والمفاصل');
    setNotes('');
    setFormError('');
    setIsClientModalOpen(true);
  };

  const openEditClient = (client: ClientProfile) => {
    setEditingClient(client);
    setClientName(client.name);
    setClientPhone(client.phone === 'بدون هاتف' ? '' : client.phone);
    setPrimaryCondition(client.primaryCondition || 'تأهيل خشونة الركبة والمفاصل');
    setNotes(client.notes || '');
    setFormError('');
    setIsClientModalOpen(true);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('يرجى إدخال اسم المريض');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const res = await onSaveClient({
        ...(editingClient ? { id: editingClient.id } : {}),
        name: clientName.trim(),
        phone: clientPhone.trim() || 'بدون هاتف',
        primaryCondition: primaryCondition.trim() || 'تأهيل خشونة الركبة والمفاصل',
        notes: notes.trim() || undefined,
      });
      if (!res.success) {
        setFormError(res.error || 'تعذر حفظ بيانات المريض');
      } else {
        setIsClientModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatWhatsAppUrl = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, '');
    const intlPhone = digits.startsWith('0') ? `20${digits.slice(1)}` : digits;
    const msg = encodeURIComponent(
      `مرحباً ${name}، نتواصل معكم من مركز التأهيل والعلاج الطبيعي.`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  };

  // Calculate client-specific metrics with robust Arabic normalization
  const clientData = clients.map((client) => {
    const clientSessions = sessions.filter(
      (s) => normalizeArabic(s.clientName) === normalizeArabic(client.name)
    );
    const totalSessions = clientSessions.length;
    const totalSpent = clientSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
    const pendingSessions = clientSessions.filter((s) => s.paymentStatus === 'pending');
    const pendingAmount = pendingSessions.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

    return {
      ...client,
      sessionCount: totalSessions,
      totalSpent,
      pendingCount: pendingSessions.length,
      pendingAmount,
    };
  });

  const filteredClients = clientData.filter((c) => {
    const q = normalizeArabic(search);
    return (
      normalizeArabic(c.name).includes(q) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      normalizeArabic(c.primaryCondition).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Add Client Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">سجل المرضى والعملاء المعتمد</h2>
            <p className="text-xs text-slate-500">
              إجمالي <span className="font-mono tabular-nums font-bold text-slate-700">{clients.length}</span> مريض مسجل في قاعدة البيانات السحابية
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن مريض بالاسم أو الهاتف..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            />
          </div>

          <button
            onClick={openAddClient}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة ملف مريض</span>
          </button>
        </div>
      </div>

      {/* Grid of Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono tabular-nums">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {client.phone && client.phone !== 'بدون هاتف' ? (
                      <>
                        <a
                          href={`tel:${client.phone}`}
                          className="hover:text-teal-700 underline decoration-dotted"
                        >
                          {client.phone}
                        </a>
                        <a
                          href={formatWhatsAppUrl(client.phone, client.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title="مراسلة عبر واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </>
                    ) : (
                      <span className="font-sans text-slate-400">بدون هاتف</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditClient(client)}
                    title="تعديل بيانات المريض"
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {client.sessionCount === 0 && (
                    <button
                      onClick={() => onDeleteClient(client)}
                      title="حذف ملف المريض"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Condition & Visit Metadata */}
              <div className="mb-3">
                <div className="text-xs text-teal-800 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{client.primaryCondition}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  <span>{client.sessionCount} جلسات</span>
                  <span className="mx-1.5">·</span>
                  <span>آخر زيارة: {client.lastVisitDate}</span>
                </div>
                {client.notes && (
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{client.notes}</p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 mb-3 border border-slate-100 font-mono tabular-nums">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">إجمالي القيمة:</span>
                  <span className="font-bold text-slate-900">
                    {client.totalSpent.toLocaleString('en-US')} جنيه
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">الرصيد المعلق:</span>
                  <span
                    className={`font-bold ${
                      client.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {client.pendingAmount.toLocaleString('en-US')} جنيه
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => onSelectClientToFilter(client.name)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3" />
                <span>عرض الجلسات ({client.sessionCount})</span>
              </button>
              <button
                onClick={() =>
                  onAddSessionForClient(client.name, client.phone, client.primaryCondition)
                }
                className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>حجز جلسة</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingClient ? 'تعديل ملف المريض' : 'إضافة ملف مريض جديد'}
              </h3>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم المريض بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="مثال: أحمد محمد علي"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="مثال: 01012345678"
                  dir="ltr"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 font-mono tabular-nums text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  التشخيص الأساسي / الحالة
                </label>
                <input
                  type="text"
                  value={primaryCondition}
                  onChange={(e) => setPrimaryCondition(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات طبية (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات عن التاريخ المرضي أو البرنامج العلاجي..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ في قاعدة البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
