import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { FilterOptions } from '../types';

interface FiltersBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  conditions: string[];
  clientNames: string[];
  totalFiltered: number;
  totalAll: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  setFilters,
  conditions,
  clientNames,
  totalFiltered,
  totalAll,
}) => {
  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.condition !== '' ||
    filters.paymentStatus !== '' ||
    filters.paymentMethod !== '' ||
    filters.clientName !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      condition: '',
      paymentStatus: '',
      paymentMethod: '',
      startDate: '',
      endDate: '',
      clientName: '',
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs mb-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search input */}
        <div className="relative md:col-span-4">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="بحث باسم العميل، الهاتف، أو الملاحظات..."
            className="w-full pl-3 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 transition-colors placeholder:text-slate-400"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Condition Filter */}
        <div className="md:col-span-3">
          <select
            value={filters.condition}
            onChange={(e) => setFilters((prev) => ({ ...prev, condition: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 transition-colors"
          >
            <option value="">جميع الحالات والإصابات</option>
            {conditions.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
        </div>

        {/* Client Name Filter */}
        <div className="md:col-span-3">
          <select
            value={filters.clientName}
            onChange={(e) => setFilters((prev) => ({ ...prev, clientName: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 transition-colors"
          >
            <option value="">جميع العملاء ({clientNames.length})</option>
            {clientNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method / Status */}
        <div className="md:col-span-2 flex items-center gap-2">
          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
            className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 transition-colors"
          >
            <option value="">طريقة الدفع (الكل)</option>
            <option value="cash">نقدي</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="credit_card">بطاقة ائتمان</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              title="إلغاء التصفية"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Stats Badge */}
      {hasActiveFilters && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              عرض <strong className="text-slate-800">{totalFiltered}</strong> نتيجة من أصل{' '}
              <strong className="text-slate-800">{totalAll}</strong> جلسة
            </span>
          </div>
          <button
            onClick={clearFilters}
            className="text-teal-700 hover:underline font-semibold cursor-pointer"
          >
            إعادة تعيين الكل
          </button>
        </div>
      )}
    </div>
  );
};
