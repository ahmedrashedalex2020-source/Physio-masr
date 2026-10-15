import React, { useState } from 'react';
import { Users, Phone, Calendar, Plus, ExternalLink, Search, Clock, DollarSign, Activity } from 'lucide-react';
import { ClientProfile, SessionRecord } from '../types';

interface ClientsDirectoryProps {
  clients: ClientProfile[];
  sessions: SessionRecord[];
  onSelectClientToFilter: (clientName: string) => void;
  onAddSessionForClient: (clientName: string, clientPhone: string, condition: string) => void;
}

export const ClientsDirectory: React.FC<ClientsDirectoryProps> = ({
  clients,
  sessions,
  onSelectClientToFilter,
  onAddSessionForClient,
}) => {
  const [search, setSearch] = useState('');

  // Calculate client-specific metrics
  const clientData = clients.map((client) => {
    const clientSessions = sessions.filter(
      (s) => s.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()
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

  const filteredClients = clientData.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.primaryCondition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">سجل المرضى والعملاء المعتمد</h2>
            <p className="text-xs text-slate-500">
              إجمالي {clients.length} مريض معتمد في قاعدة البيانات
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن مريض بالاسم أو الهاتف..."
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
          />
        </div>
      </div>

      {/* Grid of Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{client.name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {client.sessionCount} جلسات
                </span>
              </div>

              {/* Condition Badge */}
              <div className="mb-3">
                <div className="text-xs text-slate-600 bg-teal-50/80 border border-teal-100/80 text-teal-800 px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-teal-600" />
                  <span>{client.primaryCondition}</span>
                </div>
                {client.notes && (
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                    {client.notes}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 mb-3 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي القيمة:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {client.totalSpent.toLocaleString()} جنيه
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الرصيد المعلق:</span>
                  <span
                    className={`font-bold font-mono ${
                      client.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {client.pendingAmount.toLocaleString()} جنيه
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => onSelectClientToFilter(client.name)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>عرض الجلسات</span>
              </button>
              <button
                onClick={() =>
                  onAddSessionForClient(client.name, client.phone, client.primaryCondition)
                }
                className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>حجز جلسة</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
