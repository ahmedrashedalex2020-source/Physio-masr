import React from 'react';
import { Search, Filter, X, Calendar, FolderArchive, RotateCcw } from 'lucide-react';
import { FilterOptions, MonthlyArchive } from '../types';

interface FiltersBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  conditions: string[];
  clientNames: string[];
  archives: MonthlyArchive[];
  availableCalendarMonths: string[];
  openSessionsCount: number;
  totalFiltered: number;
  totalAll: number;
}

const ARABIC_MONTHS: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

function formatCalendarMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `شهر ${ARABIC_MONTHS[m] || m} ${y} (${ym})`;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  setFilters,
  conditions,
  clientNames,
  archives,
  availableCalendarMonths,
  openSessionsCount,
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
    filters.endDate !== '' ||
    filters.periodFilter !== 'current';

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      condition: '',
      paymentStatus: '',
      paymentMethod: '',
      startDate: '',
      endDate: '',
      clientName: '',
      periodFilter: 'current',
    });
  };

  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilters((prev) => ({
      ...prev,
      periodFilter: 'all',
      startDate: today,
      endDate: today,
    }));
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs mb-4 space-y-3">
      {/* Row 0: Prominent Monthly Archive & Calendar Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <FolderArchive className="w-4 h-4 text-teal-600 shrink-0" />
          <span>فلتر الشهر والأرشيف (الرجوع لأي شهر سابق في أي وقت):</span>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <select
            value={filters.periodFilter}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                periodFilter: e.target.value,
              }))
            }
            className="w-full px-3 py-2 text-xs font-bold bg-teal-50/70 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-teal-950 transition-colors cursor-pointer"
          >
            <option value="current">
              الحساب الجاري (الشهر المفتوح حالياً — {openSessionsCount} جلسة)
            </option>
            <option value="all">
              جميع الشهور والسجلات بالكامل (الحالي + الأرشيف — {totalAll} جلسة)
            </option>

            {archives.length > 0 && (
              <optgroup label="الأرشيفات الشهرية المغلقة (حسب تقفيل الحساب)">
                {archives.map((arch) => (
                  <option key={arch.id} value={`archive:${arch.id}`}>
                    أرشيف: {arch.title} ({arch.totalSessions} جلسة —{' '}
                    {arch.totalRevenue.toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </optgroup>
            )}

            {availableCalendarMonths.length > 0 && (
              <optgroup label="الرجوع حسب الشهر الميلادي (التاريخ)">
                {availableCalendarMonths.map((ym) => (
                  <option key={ym} value={`month:${ym}`}>
                    {formatCalendarMonth(ym)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {filters.periodFilter !== 'current' && (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, periodFilter: 'current' }))}
              title="الرجوع إلى الشهر المفتوح حالياً"
              className="px-2.5 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>الشهر الحالي</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Search, Client, Condition, Payment Status */}
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
            className="w-full pl-8 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 transition-colors placeholder:text-slate-400"
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

        {/* Payment Status Filter */}
        <div className="md:col-span-2">
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value as any }))}
            className="w-full px-2.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 transition-colors"
          >
            <option value="">حالة السداد (الكل)</option>
            <option value="pending">معلق / غير مدفوع</option>
            <option value="paid">مدفوع بالكامل</option>
          </select>
        </div>
      </div>

      {/* Row 2: Payment Method & Date Range Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100">
        {/* Payment Method */}
        <div className="md:col-span-3">
          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 transition-colors"
          >
            <option value="">وسيلة الدفع (الكل)</option>
            <option value="cash">نقدي (كاش)</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="credit_card">بطاقة ائتمان</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">من تاريخ:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-mono tabular-nums"
          />
        </div>

        {/* End Date */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">إلى تاريخ:</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 font-mono tabular-nums"
          />
        </div>

        {/* Quick Date & Clear Controls */}
        <div className="md:col-span-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={setTodayFilter}
            className="px-2.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>جلسات اليوم</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              title="إلغاء جميع الفلاتر والعودة للشهر الحالي"
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>مسح الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Stats Summary */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              عرض <strong className="text-slate-800 font-mono tabular-nums">{totalFiltered}</strong> نتيجة مطابقة من أصل{' '}
              <strong className="text-slate-800 font-mono tabular-nums">{totalAll}</strong> جلسة مسجلة بالنظام
            </span>
          </div>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, periodFilter: 'all' }))}
            className="text-teal-700 hover:underline font-semibold cursor-pointer"
          >
            عرض كل الشهور والأرشيف ({totalAll})
          </button>
        </div>
      )}
    </div>
  );
};
