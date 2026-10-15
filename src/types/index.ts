export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card';

export interface SessionRecord {
  id: string;
  clientName: string;
  clientPhone: string; // Phone number or "بدون هاتف"
  condition: string; // e.g. "علاج طبيعي للأطفال وتأهيل الحركة" or "تأهيل خشونة الركبة والمفاصل"
  notes?: string; // e.g. "جلسة شد فقرات قطنية وتمرينات تقوية"
  attendanceDate: string; // YYYY-MM-DD
  attendanceTime: string; // HH:mm
  basePrice: number;
  totalPrice: number;
  priceDetails: string; // e.g. "أساسي: 300 جنيه"
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
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

export interface FilterOptions {
  searchQuery: string;
  condition: string;
  paymentStatus: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  clientName: string;
}
