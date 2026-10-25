export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card';

export interface SessionRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  condition: string;
  notes?: string;
  attendanceDate: string; // YYYY-MM-DD
  attendanceTime: string; // HH:mm
  basePrice: number;
  totalPrice: number;
  priceDetails: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  archiveId?: string;
  archiveLabel?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  primaryCondition: string;
  notes?: string;
  firstVisitDate: string;
  lastVisitDate: string;
}

export interface MonthlyArchive {
  id: string;
  title: string;
  closedAt: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  paidCount: number;
  pendingCount: number;
  notes?: string;
}

export interface FilterOptions {
  searchQuery: string;
  condition: string;
  paymentStatus: PaymentStatus | '';
  paymentMethod: string;
  startDate: string;
  endDate: string;
  clientName: string;
  /**
   * Controls which monthly period or archive is active:
   * - 'current': Only currently open (unarchived) sessions for the active new month
   * - 'all': All sessions (current + all archived months)
   * - 'archive:<archiveId>': Specific closed monthly archive
   * - 'month:<YYYY-MM>': Specific calendar month
   */
  periodFilter: string;
}
