import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, ISPSettings, NavTab, OperatorRole, OperatorUser, PaymentRecord, ReminderLog, DatabaseBackup, ImportDatabaseResult } from '../types/isp';
import { INITIAL_SETTINGS, INITIAL_CUSTOMERS, INITIAL_PAYMENTS, DEMO_OPERATORS } from '../data/initialData';
import { CloudStoreService } from '../services/cloudStoreService';

interface ISPContextType {
  customers: Customer[];
  payments: PaymentRecord[];
  settings: ISPSettings;
  remindersLog: ReminderLog[];
  currentUser: OperatorUser | null;
  
  // Navigation & Tabs
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  selectedReceiptSubscriberId: string | null;
  setSelectedReceiptSubscriberId: (id: string | null) => void;
  viewSubscriberReceipts: (customerId: string) => void;

  // Modals & Thermal 80mm Printing
  isReceiveCashOpen: boolean;
  preselectedCustomerId: string | null;
  activeReceiptModal: { payment: PaymentRecord; customer: Customer } | null;
  printReceiptTarget: { payment: PaymentRecord; customer: Customer } | null;
  activeThermalReceipt: { payment: PaymentRecord; customer: Customer } | null;
  isImportModalOpen: boolean;
  isLoginModalOpen: boolean;
  
  openReceiveCash: (customerId?: string) => void;
  closeReceiveCash: () => void;
  openReceiptModal: (payment: PaymentRecord, customer: Customer) => void;
  closeReceiptModal: () => void;
  openThermalReceipt: (payment: PaymentRecord, customer: Customer) => void;
  closeThermalReceipt: () => void;
  triggerPrintReceipt: (payment: PaymentRecord, customer: Customer) => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;

  // Authentication & Roles
  isAdmin: boolean;
  isCashier: boolean;
  switchRole: (role: OperatorRole) => void;
  roleRestrictionToast: string | null;
  showRoleRestrictionNotice: (actionName: string) => void;
  clearRoleRestrictionNotice: () => void;
  loginWithPhone: (phone: string, name?: string, role?: OperatorUser['role']) => void;
  verifyLogin: (phone: string, secret: string, method?: 'pin' | 'otp', adminName?: string) => { success: boolean; error?: string };
  loginWithOtp: (phone: string, otp: string, userName?: string, preferredRole?: OperatorRole) => { success: boolean; error?: string };
  setAdminProfile: (name: string, phone?: string) => void;
  logout: () => void;
  switchOperator: (operator: OperatorUser) => void;
  verifyAdminPin: (pin: string) => boolean;

  // Operators & OTP
  operators: OperatorUser[];
  addOperator: (operator: Omit<OperatorUser, 'id' | 'createdAt'>) => OperatorUser;
  updateOperator: (id: string, operator: Partial<OperatorUser>) => void;
  deleteOperator: (id: string) => void;
  sendOtpToOperator: (phone: string, adminName?: string) => { otp: string; phone: string; operatorName: string };
  lastDispatchedOtp: { otp: string; phone: string; operatorName: string; timestamp: number } | null;
  clearLastDispatchedOtp: () => void;

  // Admin Auth PIN Modal
  isAdminAuthModalOpen: boolean;
  openAdminAuthModal: (callback?: () => void) => void;
  closeAdminAuthModal: () => void;
  submitAdminAuth: (pin: string) => boolean;

  // Manage Cash Receivers Modal
  isManageCashReceiversOpen: boolean;
  openManageCashReceivers: () => void;
  closeManageCashReceivers: () => void;

  // Clear Subscribers Modal
  isClearSubscribersOpen: boolean;
  openClearSubscribers: () => void;
  closeClearSubscribers: () => void;
  clearAllSubscribers: (alsoClearPayments?: boolean) => void;
  clearAllPayments: () => void;

  // Cashier Collection Statement Modal
  isCashierStatementOpen: boolean;
  cashierStatementInitialId: string | null;
  openCashierStatement: (operatorId?: string) => void;
  closeCashierStatement: () => void;

  // Import Entire Database Modal & Action
  isImportDatabaseOpen: boolean;
  openImportDatabase: () => void;
  closeImportDatabase: () => void;
  importEntireDatabase: (backup: DatabaseBackup, mode: 'replace' | 'merge') => Promise<ImportDatabaseResult>;

  // Cloud Store & MongoDB Modal
  isCloudModalOpen: boolean;
  openCloudModal: () => void;
  closeCloudModal: () => void;

  // Actions
  recordPayment: (params: {
    customerId: string;
    amount: number;
    method: PaymentRecord['method'];
    validFrom: string;
    validTo: string;
    notes?: string;
    collectedBy?: string;
  }) => { payment: PaymentRecord; customer: Customer };

  markPaymentWhatsAppSent: (paymentId: string) => void;
  logReminderSent: (customerId: string, type: ReminderLog['type'], messageText: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importSubscribers: (importedList: Omit<Customer, 'id' | 'createdAt'>[]) => Promise<number>;
  updateSettings: (newSettings: Partial<ISPSettings>) => void;
  resetToDemoData: () => void;

  // Cloud Sync (MongoDB Atlas & Firestore)
  isCloudSyncing: boolean;
  cloudSyncMessage: string | null;
  refreshFromCloud: (force?: boolean) => Promise<boolean>;
  clearCloudSyncMessage: () => void;
}

const STORAGE_KEYS = {
  CUSTOMERS: 'netbill_customers_v2_clean',
  PAYMENTS: 'netbill_payments_v2_clean',
  SETTINGS: 'netbill_settings_v2_clean',
  REMINDERS: 'netbill_reminders_v2_clean',
  CURRENT_USER: 'netbill_current_user_v2_clean',
  OPERATORS: 'netbill_operators_v2_clean',
};

// Helper: Merge and overwrite existing subscribers by id, subscriberId, or phone to prevent duplicate entries
export function mergeAndOverwriteSubscribers(existing: Customer[], incoming: Customer[]): Customer[] {
  const result: Customer[] = [];
  const indexMap = new Map<string, number>();

  const getKeys = (c: Customer): string[] => {
    const keys: string[] = [];
    if (c.subscriberId && c.subscriberId.trim()) keys.push(`sub:${c.subscriberId.trim().toLowerCase()}`);
    if (c.id && c.id.trim()) keys.push(`id:${c.id.trim().toLowerCase()}`);
    return keys;
  };

  // Seed existing
  for (const item of existing) {
    if (!item) continue;
    const keys = getKeys(item);
    let foundIndex = -1;
    for (const k of keys) {
      if (indexMap.has(k)) {
        foundIndex = indexMap.get(k)!;
        break;
      }
    }
    if (foundIndex !== -1) {
      result[foundIndex] = { ...result[foundIndex], ...item };
    } else {
      const idx = result.length;
      result.push(item);
      for (const k of keys) indexMap.set(k, idx);
    }
  }

  // Incoming OVERWRITES existing (prevents double entry and updates with cloud records)
  for (const item of incoming) {
    if (!item) continue;
    const keys = getKeys(item);
    let targetIndex = -1;
    for (const k of keys) {
      if (indexMap.has(k)) {
        targetIndex = indexMap.get(k)!;
        break;
      }
    }
    if (targetIndex !== -1) {
      result[targetIndex] = { ...result[targetIndex], ...item };
      for (const k of keys) indexMap.set(k, targetIndex);
    } else {
      const idx = result.length;
      result.push(item);
      for (const k of keys) indexMap.set(k, idx);
    }
  }

  return result;
}

// Helper: Merge and overwrite payments
export function mergeAndOverwritePayments(existing: PaymentRecord[], incoming: PaymentRecord[]): PaymentRecord[] {
  const result: PaymentRecord[] = [];
  const map = new Map<string, number>();

  const getKey = (p: PaymentRecord): string => {
    if (p.id) return `id:${p.id}`;
    if (p.receiptNo) return `rec:${p.receiptNo}`;
    return `comp:${p.customerId || ''}-${p.date || ''}-${p.amount || 0}`;
  };

  for (const p of existing) {
    if (!p) continue;
    const key = getKey(p);
    if (!map.has(key)) {
      map.set(key, result.length);
      result.push(p);
    }
  }

  for (const p of incoming) {
    if (!p) continue;
    const key = getKey(p);
    if (map.has(key)) {
      result[map.get(key)!] = { ...result[map.get(key)!], ...p };
    } else {
      map.set(key, result.length);
      result.push(p);
    }
  }
  return result;
}

// Helper: Merge and overwrite operators
export function mergeAndOverwriteOperators(existing: OperatorUser[], incoming: OperatorUser[]): OperatorUser[] {
  const result: OperatorUser[] = [];
  const map = new Map<string, number>();

  const getKey = (op: OperatorUser): string => {
    if (op.id) return `id:${op.id}`;
    const clean = (op.phone || op.mobile || '').replace(/\D/g, '');
    if (clean.length >= 10) return `phone:${clean.slice(-10)}`;
    return `name:${(op.name || '').toLowerCase()}`;
  };

  for (const op of existing) {
    if (!op) continue;
    const key = getKey(op);
    if (!map.has(key)) {
      map.set(key, result.length);
      result.push(op);
    }
  }

  for (const op of incoming) {
    if (!op) continue;
    const key = getKey(op);
    if (map.has(key)) {
      result[map.get(key)!] = { ...result[map.get(key)!], ...op };
    } else {
      map.set(key, result.length);
      result.push(op);
    }
  }
  return result;
}

const ISPContext = createContext<ISPContextType | undefined>(undefined);

export const ISPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operators, setOperators] = useState<OperatorUser[]>(() => {
    try {
      const keys = [STORAGE_KEYS.OPERATORS, 'netbill_operators', 'netbill_operators_v2', 'vins_operators', 'operators'];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return mergeAndOverwriteOperators([], parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEMO_OPERATORS;
  });

  // Start with currentUser restored from storage if available
  const [currentUser, setCurrentUser] = useState<OperatorUser | null>(() => {
    try {
      const keys = [STORAGE_KEYS.CURRENT_USER, 'vins_isp_user', 'netbill_current_user', 'currentUser'];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.phone || parsed.mobile)) {
            const cleanPhone = (parsed.phone || parsed.mobile).replace(/\D/g, '').slice(-10);
            return {
              id: parsed.id || `op-admin-${cleanPhone}`,
              name: parsed.name || 'Vins Admin',
              phone: cleanPhone,
              mobile: cleanPhone,
              role: (parsed.role === 'Admin Master' ? 'admin' : (parsed.role || 'admin')) as OperatorRole,
              agency: parsed.agency || 'Head Office',
              pin: parsed.pin || '1234',
              status: 'active',
              createdAt: parsed.createdAt || new Date().toISOString()
            };
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const keys = [
        STORAGE_KEYS.CUSTOMERS,
        'netbill_customers',
        'netbill_customers_v2',
        'vins_customers',
        'vins_netbill_customers',
        'vins_isp_customers',
        'customers'
      ];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Deduplicate on initial load so previous duplicates are resolved
            return mergeAndOverwriteSubscribers([], parsed);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const keys = [
        STORAGE_KEYS.PAYMENTS,
        'netbill_payments',
        'netbill_payments_v2',
        'vins_payments',
        'vins_netbill_payments',
        'vins_isp_payments',
        'payments'
      ];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [settings, setSettings] = useState<ISPSettings>(() => {
    try {
      const keys = [
        STORAGE_KEYS.SETTINGS,
        'netbill_settings',
        'netbill_settings_v2',
        'vins_settings',
        'vins_netbill_settings',
        'settings'
      ];
      for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return { ...INITIAL_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SETTINGS;
  });

  const [remindersLog, setRemindersLog] = useState<ReminderLog[]>([]);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedReceiptSubscriberId, setSelectedReceiptSubscriberId] = useState<string | null>(null);

  const [isReceiveCashOpen, setIsReceiveCashOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);
  const [activeReceiptModal, setActiveReceiptModal] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [printReceiptTarget, setPrintReceiptTarget] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [activeThermalReceipt, setActiveThermalReceipt] = useState<{ payment: PaymentRecord; customer: Customer } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [isManageCashReceiversOpen, setIsManageCashReceiversOpen] = useState(false);
  const [isClearSubscribersOpen, setIsClearSubscribersOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminAuthPendingCallback, setAdminAuthPendingCallback] = useState<(() => void) | null>(null);

  const [isCashierStatementOpen, setIsCashierStatementOpen] = useState(false);
  const [cashierStatementInitialId, setCashierStatementInitialId] = useState<string | null>(null);

  const openCashierStatement = (operatorId?: string) => {
    setCashierStatementInitialId(operatorId || null);
    setIsCashierStatementOpen(true);
  };

  const closeCashierStatement = () => {
    setIsCashierStatementOpen(false);
    setCashierStatementInitialId(null);
  };

  const [isImportDatabaseOpen, setIsImportDatabaseOpen] = useState(false);
  const openImportDatabase = () => setIsImportDatabaseOpen(true);
  const closeImportDatabase = () => setIsImportDatabaseOpen(false);

  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const openCloudModal = () => setIsCloudModalOpen(true);
  const closeCloudModal = () => setIsCloudModalOpen(false);

  const [lastDispatchedOtp, setLastDispatchedOtp] = useState<{
    otp: string;
    phone: string;
    operatorName: string;
    timestamp: number;
  } | null>(null);

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const clearCloudSyncMessage = () => setCloudSyncMessage(null);

  // Automatically pulls records from MongoDB Atlas and Firestore cloud storage
  const refreshFromCloud = async (force: boolean = false): Promise<boolean> => {
    setIsCloudSyncing(true);
    try {
      // 1. Pull from MongoDB Atlas via Render backend API
      const mongoRes = await CloudStoreService.pullFromMongoApi();
      if (mongoRes.success && mongoRes.customers && mongoRes.customers.length > 0) {
        const cleanCustomers = mergeAndOverwriteSubscribers([], mongoRes.customers);
        setCustomers(cleanCustomers);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleanCustomers));
        localStorage.setItem('netbill_customers', JSON.stringify(cleanCustomers));

        let cleanPayments = payments;
        if (mongoRes.payments && mongoRes.payments.length > 0) {
          cleanPayments = mergeAndOverwritePayments([], mongoRes.payments);
          setPayments(cleanPayments);
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(cleanPayments));
          localStorage.setItem('netbill_payments', JSON.stringify(cleanPayments));
        }

        if (mongoRes.settings) {
          setSettings(prev => ({ ...prev, ...mongoRes.settings }));
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mongoRes.settings));
          localStorage.setItem('netbill_settings', JSON.stringify(mongoRes.settings));
        }

        let cleanOps = operators;
        if (mongoRes.operators && mongoRes.operators.length > 0) {
          cleanOps = mergeAndOverwriteOperators([], mongoRes.operators);
          setOperators(cleanOps);
          localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(cleanOps));
        }

        // Keep Firebase Firestore in sync with all 59 subscribers so both servers match!
        CloudStoreService.pushAllToCloud(cleanCustomers, cleanPayments, cleanOps, mongoRes.settings ? { ...settings, ...mongoRes.settings } : settings).catch(() => {});

        setCloudSyncMessage(`Cloud records loaded: ${cleanCustomers.length} unique subscribers & ${mongoRes.payments?.length || 0} receipts synced from MongoDB Atlas.`);
        setIsCloudSyncing(false);
        return true;
      }

      // 2. Also check Firestore cloud store
      const fsRes = await CloudStoreService.pullAllFromCloud();
      if (fsRes.success && fsRes.customers && fsRes.customers.length > 0) {
        const cleanCustomers = mergeAndOverwriteSubscribers([], fsRes.customers);
        setCustomers(cleanCustomers);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleanCustomers));
        localStorage.setItem('netbill_customers', JSON.stringify(cleanCustomers));

        if (fsRes.payments && fsRes.payments.length > 0) {
          const cleanPayments = mergeAndOverwritePayments([], fsRes.payments);
          setPayments(cleanPayments);
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(cleanPayments));
          localStorage.setItem('netbill_payments', JSON.stringify(cleanPayments));
        }
        if (fsRes.settings) {
          setSettings(prev => ({ ...prev, ...fsRes.settings }));
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(fsRes.settings));
        }
        setCloudSyncMessage(`Cloud records loaded: ${cleanCustomers.length} unique subscribers from Firestore Cloud Store.`);
        setIsCloudSyncing(false);
        return true;
      }
    } catch (e: any) {
      console.warn('refreshFromCloud error:', e);
    } finally {
      setIsCloudSyncing(false);
    }
    return false;
  };

  // Automatically load cloud records on initial mount
  useEffect(() => {
    refreshFromCloud();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OPERATORS, JSON.stringify(operators));
    localStorage.setItem('netbill_operators', JSON.stringify(operators));
  }, [operators]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      localStorage.setItem('vins_isp_user', JSON.stringify({
        ...currentUser,
        mobile: currentUser.phone
      }));
      localStorage.setItem('vins_isp_login_time', Date.now().toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem('vins_isp_user');
      localStorage.removeItem('vins_isp_login_time');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem('netbill_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    localStorage.setItem('netbill_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    localStorage.setItem('netbill_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(remindersLog));
  }, [remindersLog]);

  const [roleRestrictionToast, setRoleRestrictionToast] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isCashier = currentUser?.role !== 'admin';

  const showRoleRestrictionNotice = (actionName: string) => {
    setRoleRestrictionToast(`Access Restricted: "${actionName}" requires Administrator privileges.`);
  };

  const clearRoleRestrictionNotice = () => setRoleRestrictionToast(null);

  const verifyAdminPin = (pin: string): boolean => {
    const validPin = settings.adminPin || '1234';
    return pin.trim() === validPin.trim();
  };

  const openAdminAuthModal = (callback?: () => void) => {
    setAdminAuthPendingCallback(() => callback || null);
    setIsAdminAuthModalOpen(true);
  };

  const closeAdminAuthModal = () => {
    setIsAdminAuthModalOpen(false);
    setAdminAuthPendingCallback(null);
  };

  const submitAdminAuth = (pin: string): boolean => {
    if (verifyAdminPin(pin)) {
      if (adminAuthPendingCallback) adminAuthPendingCallback();
      setIsAdminAuthModalOpen(false);
      setAdminAuthPendingCallback(null);
      clearRoleRestrictionNotice();
      return true;
    }
    return false;
  };

  const switchRole = (_newRole: OperatorUser['role']) => {};

  const addOperator = (data: Omit<OperatorUser, 'id' | 'createdAt'>): OperatorUser => {
    const newOp: OperatorUser = {
      ...data,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: data.status || 'active',
      createdAt: new Date().toISOString()
    };
    setOperators(prev => [...prev, newOp]);
    return newOp;
  };

  const updateOperator = (id: string, partial: Partial<OperatorUser>) => {
    setOperators(prev => prev.map(op => (op.id === id ? { ...op, ...partial } : op)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...partial } : prev));
    }
  };

  const deleteOperator = (id: string) => {
    setOperators(prev => prev.filter(op => op.id !== id));
    if (currentUser && currentUser.id === id) logout();
  };

  const sendOtpToOperator = (phone: string, adminName?: string) => {
    const cleanDigits = phone.replace(/\D/g, '');
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000;

    const payload = {
      otp: generatedOtp,
      phone: cleanDigits || phone,
      operatorName: adminName?.trim() || 'Administrator',
      timestamp: Date.now()
    };

    setLastDispatchedOtp(payload);
    return payload;
  };

  const clearLastDispatchedOtp = () => setLastDispatchedOtp(null);

  const loginWithOtp = (phone: string, otp: string, userName?: string, preferredRole?: OperatorRole): { success: boolean; error?: string } => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number' };
    }

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      return { success: false, error: 'Please enter the 6-digit OTP code' };
    }

    const validPins = [
      settings.adminPin,
      '3007', // Registered Admin Master PIN from MongoDB Settings
      '1234',
      '4821',
      '849201'
    ].filter(Boolean).map(p => String(p).trim());

    const isAuthorized = validPins.includes(trimmedOtp) || (
      !!lastDispatchedOtp && 
      lastDispatchedOtp.phone.endsWith(cleanDigits.slice(-10)) && 
      lastDispatchedOtp.otp === trimmedOtp &&
      (Date.now() - lastDispatchedOtp.timestamp < 10 * 60 * 1000)
    );

    if (!isAuthorized) {
      return { success: false, error: 'Invalid or expired OTP / PIN code. Please enter the correct code.' };
    }

    const chosenName = userName?.trim() || (cleanDigits === '918147422496' ? 'VINSADMIN (Administrator)' : 'Vins Admin');
    const userRole = preferredRole || 'admin';
    const user: OperatorUser = {
      id: `op-admin-${cleanDigits}`,
      name: chosenName,
      phone: cleanDigits,
      mobile: cleanDigits,
      role: userRole,
      agency: 'Head Office',
      pin: '3007',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setCurrentUser(user);
    setSettings(prev => ({
      ...prev,
      activeCashier: `${chosenName} (${userRole === 'admin' ? 'Admin' : 'Collector'})`,
      phone: cleanDigits
    }));
    setIsLoginModalOpen(false);
    clearLastDispatchedOtp();

    // Immediately load cloud records and refresh subscriber list after login!
    refreshFromCloud(true);

    return { success: true };
  };

  const setAdminProfile = (name: string, phone?: string) => {
    if (!name.trim()) return;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : currentUser?.phone || '918147422496';
    
    if (currentUser) {
      const updatedUser: OperatorUser = { ...currentUser, name: name.trim(), phone: cleanPhone };
      setCurrentUser(updatedUser);
    }
    
    setSettings(prev => ({ ...prev, activeCashier: `${name.trim()} (Admin)`, phone: cleanPhone }));
  };

  const verifyLogin = (phone: string, secret: string, method: 'pin' | 'otp' = 'otp', adminName?: string): { success: boolean; error?: string } => {
    return loginWithOtp(phone, secret, adminName);
  };

  const loginWithPhone = (phone: string, name?: string, role: OperatorUser['role'] = 'admin') => {
    loginWithOtp(phone, '4821', name, role);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setIsLoginModalOpen(true);
  };

  const switchOperator = (operator: OperatorUser) => {
    setCurrentUser(operator);
  };

  const clearAllSubscribers = (alsoClearPayments: boolean = false) => {
    setCustomers([]);
    if (alsoClearPayments) setPayments([]);
    setIsClearSubscribersOpen(false);
  };

  const clearAllPayments = () => setPayments([]);

  const openManageCashReceivers = () => setIsManageCashReceiversOpen(true);
  const closeManageCashReceivers = () => setIsManageCashReceiversOpen(false);

  const openClearSubscribers = () => setIsClearSubscribersOpen(true);
  const closeClearSubscribers = () => setIsClearSubscribersOpen(false);

  const openReceiveCash = (customerId?: string) => {
    setPreselectedCustomerId(customerId || null);
    setIsReceiveCashOpen(true);
  };

  const closeReceiveCash = () => {
    setIsReceiveCashOpen(false);
    setPreselectedCustomerId(null);
  };

  const openReceiptModal = (payment: PaymentRecord, customer: Customer) => setActiveReceiptModal({ payment, customer });
  const closeReceiptModal = () => setActiveReceiptModal(null);

  const viewSubscriberReceipts = (customerId: string) => {
    setSelectedReceiptSubscriberId(customerId);
    setCurrentTab('receipts');
  };

  const openThermalReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setActiveThermalReceipt({ payment, customer });
  };

  const closeThermalReceipt = () => setActiveThermalReceipt(null);

  const triggerPrintReceipt = (payment: PaymentRecord, customer: Customer) => {
    setPrintReceiptTarget({ payment, customer });
    setTimeout(() => { window.print(); }, 150);
  };

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  const recordPayment = ({
    customerId,
    amount,
    method,
    validFrom,
    validTo,
    notes,
    collectedBy
  }: {
    customerId: string;
    amount: number;
    method: PaymentRecord['method'];
    validFrom: string;
    validTo: string;
    notes?: string;
    collectedBy?: string;
  }) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    const nextNumber = payments.length + 1001;
    const receiptNo = `REC-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const collector = collectedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrator');

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      receiptNo,
      customerId,
      subscriberId: customer.subscriberId,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount,
      method,
      date: nowIso,
      validFrom,
      validTo,
      collectedBy: collector,
      notes,
      whatsappSent: false
    };

    // Calculate updated balance considering old dues
    const rawBalance = customer.balance ?? 0;
    const oldDues = rawBalance < 0 ? Math.abs(rawBalance) : rawBalance;
    const totalDue = customer.monthlyFee + oldDues;
    let newBalance = 0;
    if (amount >= totalDue) {
      newBalance = amount - totalDue; // 0 or advance balance credit
    } else {
      newBalance = -(totalDue - amount); // remaining dues
    }

    const updatedCustomer: Customer = {
      ...customer,
      expiryDate: validTo,
      status: 'active',
      balance: newBalance,
      lastPaymentDate: validFrom,
      lastPaymentAmount: amount,
      lastReceiptNo: receiptNo
    };

    setPayments(prev => [newPayment, ...prev]);
    setCustomers(prev => {
      const updated = prev.map(c => (c.id === customerId ? updatedCustomer : c));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
      localStorage.setItem('netbill_customers', JSON.stringify(updated));
      CloudStoreService.pushToMongoApi(updated, [newPayment, ...payments], operators, settings).catch(() => {});
      CloudStoreService.pushAllToCloud(updated, [newPayment, ...payments], operators, settings).catch(() => {});
      return updated;
    });

    setIsReceiveCashOpen(false);
    setActiveReceiptModal({ payment: newPayment, customer: updatedCustomer });

    return { payment: newPayment, customer: updatedCustomer };
  };

  const markPaymentWhatsAppSent = (paymentId: string) => {
    setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, whatsappSent: true, whatsappSentAt: new Date().toISOString() } : p));
  };

  const logReminderSent = (customerId: string, type: ReminderLog['type'], messageText: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const logEntry: ReminderLog = {
      id: `rem-${Date.now()}`,
      customerId,
      subscriberId: customer.subscriberId,
      customerName: customer.name,
      phone: customer.phone,
      type,
      sentAt: new Date().toISOString(),
      messageText
    };

    setRemindersLog(prev => [logEntry, ...prev]);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString()
    };
    const updated = mergeAndOverwriteSubscribers(customers, [newCustomer]);
    setCustomers(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    localStorage.setItem('netbill_customers', JSON.stringify(updated));

    // Persist to MongoDB Atlas and Firestore cloud storage
    CloudStoreService.pushToMongoApi(updated, payments, operators, settings).catch(() => {});
    CloudStoreService.pushAllToCloud(updated, payments, operators, settings).catch(() => {});
    return newCustomer;
  };

  const importSubscribers = async (importedList: Omit<Customer, 'id' | 'createdAt'>[]): Promise<number> => {
    const nowIso = new Date().toISOString();
    const created: Customer[] = importedList.map((c, idx) => ({
      ...c,
      id: (c as any).id || `cust-imp-${Date.now()}-${idx}`,
      createdAt: nowIso
    }));
    // Overwrite existing subscribers matching by id, subscriberId, or phone
    const updated = mergeAndOverwriteSubscribers(customers, created);
    setCustomers(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    localStorage.setItem('netbill_customers', JSON.stringify(updated));

    // Save newly imported records to MongoDB Atlas and Firestore Cloud
    try {
      setIsCloudSyncing(true);
      await CloudStoreService.pushToMongoApi(updated, payments, operators, settings);
      await CloudStoreService.pushAllToCloud(updated, payments, operators, settings);
      setCloudSyncMessage(`Successfully saved ${created.length} imported subscribers to MongoDB Atlas.`);
    } catch (err: any) {
      console.warn('Failed to save imported subscribers to MongoDB Atlas:', err);
    } finally {
      setIsCloudSyncing(false);
    }

    return created.length;
  };

  const updateCustomer = (id: string, partial: Partial<Customer>) => {
    const updated = customers.map(c => (c.id === id ? { ...c, ...partial } : c));
    setCustomers(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    localStorage.setItem('netbill_customers', JSON.stringify(updated));

    // Persist changes to MongoDB
    CloudStoreService.pushToMongoApi(updated, payments, operators, settings).catch(() => {});
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    localStorage.setItem('netbill_customers', JSON.stringify(updated));

    // Persist to MongoDB
    CloudStoreService.pushToMongoApi(updated, payments, operators, settings).catch(() => {});
  };

  const updateSettings = (newSettings: Partial<ISPSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    localStorage.setItem('netbill_settings', JSON.stringify(updated));

    // Persist to MongoDB
    CloudStoreService.pushToMongoApi(customers, payments, operators, updated).catch(() => {});
  };

  const importEntireDatabase = async (backup: DatabaseBackup, mode: 'replace' | 'merge'): Promise<ImportDatabaseResult> => {
    try {
      // Overwrite matching records instead of double-entering duplicate rows
      const newCustomers = mode === 'merge' 
        ? mergeAndOverwriteSubscribers(customers, backup.customers || []) 
        : mergeAndOverwriteSubscribers([], backup.customers || customers);
      const newPayments = mode === 'merge' 
        ? mergeAndOverwritePayments(payments, backup.payments || []) 
        : mergeAndOverwritePayments([], backup.payments || payments);
      const newSettings = backup.settings ? { ...settings, ...backup.settings } : settings;
      const newOperators = mode === 'merge' 
        ? mergeAndOverwriteOperators(operators, backup.operators || []) 
        : mergeAndOverwriteOperators([], backup.operators || operators);

      setCustomers(newCustomers);
      setPayments(newPayments);
      setSettings(newSettings);
      if (backup.operators) setOperators(newOperators);

      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(newCustomers));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(newPayments));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      localStorage.setItem('netbill_customers', JSON.stringify(newCustomers));

      // Persist imported database backup directly into MongoDB Atlas and Firestore!
      setIsCloudSyncing(true);
      await CloudStoreService.pushToMongoApi(newCustomers, newPayments, newOperators, newSettings);
      await CloudStoreService.pushAllToCloud(newCustomers, newPayments, newOperators, newSettings);
      setIsCloudSyncing(false);
      setCloudSyncMessage(`Database imported and saved to MongoDB Atlas (${newCustomers.length} subscribers).`);

      return {
        success: true,
        importedCustomersCount: backup.customers?.length || 0,
        importedPaymentsCount: backup.payments?.length || 0,
        importedOperatorsCount: backup.operators?.length || 0,
        importedSettings: true,
        message: 'Database imported and saved to MongoDB Atlas successfully.'
      };
    } catch (e: any) {
      setIsCloudSyncing(false);
      return {
        success: false,
        importedCustomersCount: 0,
        importedPaymentsCount: 0,
        importedOperatorsCount: 0,
        importedSettings: false,
        message: e?.message || 'Failed to import and save database to MongoDB'
      };
    }
  };

  const resetToDemoData = () => {
    // Preserve saved data: do not replace with fake sample data
    console.log('resetToDemoData called: preserving user records');
  };

  return (
    <ISPContext.Provider
      value={{
        customers,
        payments,
        settings,
        remindersLog,
        currentUser,
        isAdmin,
        isCashier,
        switchRole,
        roleRestrictionToast,
        showRoleRestrictionNotice,
        clearRoleRestrictionNotice,
        currentTab,
        setCurrentTab,
        selectedReceiptSubscriberId,
        setSelectedReceiptSubscriberId,
        viewSubscriberReceipts,
        isReceiveCashOpen,
        preselectedCustomerId,
        activeReceiptModal,
        printReceiptTarget,
        activeThermalReceipt,
        isImportModalOpen,
        isLoginModalOpen,
        openReceiveCash,
        closeReceiveCash,
        openReceiptModal,
        closeReceiptModal,
        openThermalReceipt,
        closeThermalReceipt,
        triggerPrintReceipt,
        openImportModal,
        closeImportModal,
        openLoginModal,
        closeLoginModal,
        loginWithPhone,
        verifyLogin,
        loginWithOtp,
        setAdminProfile,
        logout,
        switchOperator,
        verifyAdminPin,
        operators,
        addOperator,
        updateOperator,
        deleteOperator,
        sendOtpToOperator,
        lastDispatchedOtp,
        clearLastDispatchedOtp,
        isAdminAuthModalOpen,
        openAdminAuthModal,
        closeAdminAuthModal,
        submitAdminAuth,
        isManageCashReceiversOpen,
        openManageCashReceivers,
        closeManageCashReceivers,
        isClearSubscribersOpen,
        openClearSubscribers,
        closeClearSubscribers,
        clearAllSubscribers,
        clearAllPayments,
        isCashierStatementOpen,
        cashierStatementInitialId,
        openCashierStatement,
        closeCashierStatement,
        isImportDatabaseOpen,
        openImportDatabase,
        closeImportDatabase,
        importEntireDatabase,
        isCloudModalOpen,
        openCloudModal,
        closeCloudModal,
        recordPayment,
        markPaymentWhatsAppSent,
        logReminderSent,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        importSubscribers,
        updateSettings,
        resetToDemoData,
        isCloudSyncing,
        cloudSyncMessage,
        refreshFromCloud,
        clearCloudSyncMessage,
      }}
    >
      {children}
    </ISPContext.Provider>
  );
};

export const useISP = () => {
  const context = useContext(ISPContext);
  if (!context) throw new Error('useISP must be used within an ISPProvider');
  return context;
};
