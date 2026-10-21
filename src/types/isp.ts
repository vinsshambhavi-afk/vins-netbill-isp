export type SubscriberStatus = 'active' | 'due_soon' | 'due_today' | 'overdue' | 'suspended';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card';

export type ConnectionType = 'FTTH' | 'Fiber' | 'Wireless' | 'Coaxial';

export type OperatorRole = 'admin' | 'cashier' | 'collector' | 'field_agent';

export type NavTab = 'dashboard' | 'collections' | 'reminders' | 'subscribers' | 'collectors' | 'receipts' | 'settings';

export interface OperatorUser {
  id: string;
  name: string;
  phone: string;
  mobile?: string;
  role: OperatorRole;
  agency?: string;
  assignedArea?: string;
  dailyTarget?: number;
  pin?: string;             // 4-digit security PIN set by Admin
  activeOtp?: string;       // Active or last dispatched OTP
  otpExpiresAt?: number;    // Expiration timestamp for OTP
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface Customer {
  id: string;
  subscriberId: string;
  activationNumber: string; // CAF / Activation Number / ONT Serial
  name: string;
  phone: string;
  email?: string;
  address: string;
  area: string;
  planName: string;
  speedMbps: number;
  monthlyFee: number;
  billingDay: number; // e.g. 1st, 5th, 10th
  expiryDate: string; // YYYY-MM-DD
  status: SubscriberStatus;
  balance: number; // 0 = settled, <0 = dues pending, >0 = advance credit
  ipAddress?: string;
  connectionType: ConnectionType;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastReceiptNo?: string;
  lastReminderSentAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  customerId: string;
  subscriberId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: PaymentMethod;
  date: string; // ISO date string
  validFrom: string;
  validTo: string;
  collectedBy: string;
  notes?: string;
  whatsappSent: boolean;
  whatsappSentAt?: string;
}

export interface ReminderLog {
  id: string;
  customerId: string;
  subscriberId: string;
  customerName: string;
  phone: string;
  type: 'upcoming' | 'due_today' | 'overdue' | 'suspension';
  sentAt: string;
  messageText: string;
}

export interface ISPSettings {
  ispName: string;
  tagline: string;
  phone: string;
  supportPhone: string;
  email: string;
  address: string;
  gstOrTaxNo: string;
  currencySymbol: string;
  upiId: string;
  activeCashier: string;
  adminPin?: string;
  website?: string;
  receiptFooter: string;
  templates: {
    cashReceipt: string;
    upcomingReminder: string;
    dueTodayReminder: string;
    overdueReminder: string;
    suspensionReminder: string;
  };
}

export interface DatabaseBackup {
  settings?: ISPSettings;
  customers?: Customer[];
  payments?: PaymentRecord[];
  operators?: OperatorUser[];
  remindersLog?: ReminderLog[];
  exportedAt?: string;
  version?: string;
}

export interface ImportDatabaseResult {
  success: boolean;
  importedCustomersCount: number;
  importedPaymentsCount: number;
  importedOperatorsCount: number;
  importedSettings: boolean;
  message: string;
}
